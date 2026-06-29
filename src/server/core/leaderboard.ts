import { context, reddit, redis } from '@devvit/web/server';

/**
 * Filter out deleted accounts, anonymous contributors, and system bots (like AutoModerator).
 */
export const isEligibleUser = (username?: string): boolean => {
  if (!username) return false;
  const name = username.toLowerCase();
  return name !== '[deleted]' && name !== 'deleted' && name !== 'automoderator' && name !== '';
};

/**
 * Updates a user's post score delta in Redis sorted sets.
 */
export const updatePostScore = async (postId: string, authorName: string, newScore: number): Promise<void> => {
  if (!isEligibleUser(authorName)) return;

  const scoreKey = `post:${postId}:score`;
  const authorKey = `post:${postId}:author`;

  // Get previous cached score
  const oldScoreStr = await redis.get(scoreKey);
  const oldScore = oldScoreStr ? Number(oldScoreStr) : 0;

  const delta = newScore - oldScore;

  if (delta !== 0) {
    // Update score in leaderboard:posts and leaderboard:combined
    await Promise.all([
      redis.zIncrBy('leaderboard:posts', authorName, delta),
      redis.zIncrBy('leaderboard:combined', authorName, delta),
    ]);

    // Cache the new score and author with a 14-day expiration to prevent memory leaks
    const expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await Promise.all([
      redis.set(scoreKey, String(newScore), { expiration: expiryDate }),
      redis.set(authorKey, authorName, { expiration: expiryDate }),
    ]);
  }
};

/**
 * Updates a user's comment score delta in Redis sorted sets.
 */
export const updateCommentScore = async (commentId: string, authorName: string, newScore: number): Promise<void> => {
  if (!isEligibleUser(authorName)) return;

  const scoreKey = `comment:${commentId}:score`;
  const authorKey = `comment:${commentId}:author`;

  // Get previous cached score
  const oldScoreStr = await redis.get(scoreKey);
  const oldScore = oldScoreStr ? Number(oldScoreStr) : 0;

  const delta = newScore - oldScore;

  if (delta !== 0) {
    // Update score in leaderboard:comments and leaderboard:combined
    await Promise.all([
      redis.zIncrBy('leaderboard:comments', authorName, delta),
      redis.zIncrBy('leaderboard:combined', authorName, delta),
    ]);

    // Cache the new score and author with a 14-day expiration to prevent memory leaks
    const expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await Promise.all([
      redis.set(scoreKey, String(newScore), { expiration: expiryDate }),
      redis.set(authorKey, authorName, { expiration: expiryDate }),
    ]);
  }
};

/**
 * Syncs scores for the 10 newest posts and their 20 newest comments.
 * Ensures karma changes from native voting are synchronized into Redis.
 */
export const syncSubredditScores = async (): Promise<void> => {
  const subredditName = context.subredditName;
  if (!subredditName) return;

  try {
    // Fetch the 10 newest posts in the subreddit
    const postsListing = await reddit.getNewPosts({
      subredditName,
      limit: 10,
    }).all();

    const postPromises = postsListing.map(async (post) => {
      const authorName = post.authorName;
      const postId = post.id;
      const score = post.score;

      // Update the post score in Redis
      await updatePostScore(postId, authorName, score);

      // Fetch the 20 newest comments for this post
      try {
        const commentsListing = await reddit.getComments({
          postId,
          limit: 20,
          sort: 'new',
        }).all();

        const commentPromises = commentsListing.map(async (comment) => {
          const commentAuthor = comment.authorName;
          const commentId = comment.id;
          const commentScore = comment.score;

          await updateCommentScore(commentId, commentAuthor, commentScore);
        });

        await Promise.all(commentPromises);
      } catch (err) {
        console.error(`Error syncing comments for post ${postId}:`, err);
      }
    });

    await Promise.all(postPromises);
  } catch (error) {
    console.error('Error executing syncSubredditScores:', error);
  }
};

/**
 * Retrieves the top 10 members from the post, comment, and combined leaderboards,
 * enriched with user avatar URLs.
 */
export const getLeaderboardData = async () => {
  const [postsRaw, commentsRaw, combinedRaw] = await Promise.all([
    redis.zRange('leaderboard:posts', 0, 9, { by: 'rank', reverse: true }),
    redis.zRange('leaderboard:comments', 0, 9, { by: 'rank', reverse: true }),
    redis.zRange('leaderboard:combined', 0, 9, { by: 'rank', reverse: true }),
  ]);

  const uniqueUsers = Array.from(
    new Set([
      ...postsRaw.map((u) => u.member),
      ...commentsRaw.map((u) => u.member),
      ...combinedRaw.map((u) => u.member),
    ])
  );

  const avatarMap: Record<string, string> = {};
  await Promise.all(
    uniqueUsers.map(async (username) => {
      const cacheKey = `user:${username}:avatar`;
      let avatar = await redis.get(cacheKey);
      if (!avatar) {
        try {
          avatar = await reddit.getSnoovatarUrl(username);
          if (avatar) {
            const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await redis.set(cacheKey, avatar, { expiration: expiryDate });
          }
        } catch (e) {
          console.error(`Error getting avatar for ${username}:`, e);
        }
      }
      if (avatar) {
        avatarMap[username] = avatar;
      }
    })
  );

  const enrich = (list: { member: string; score: number }[]) =>
    list.map((u) => ({
      member: u.member,
      score: u.score,
      avatarUrl: avatarMap[u.member],
    }));

  return {
    posts: enrich(postsRaw),
    comments: enrich(commentsRaw),
    combined: enrich(combinedRaw),
  };
};
