import { expect, vi } from 'vitest';
import { test } from '../test';
import { 
  isEligibleUser, 
  updatePostScore, 
  updateCommentScore, 
  getLeaderboardData 
} from './leaderboard';
import { reddit, redis } from '@devvit/web/server';

vi.spyOn(reddit, 'getSnoovatarUrl').mockResolvedValue('avatar.png');

test('isEligibleUser validation', () => {
  expect(isEligibleUser('spez')).toBe(true);
  expect(isEligibleUser('AutoModerator')).toBe(false);
  expect(isEligibleUser('[deleted]')).toBe(false);
  expect(isEligibleUser('deleted')).toBe(false);
  expect(isEligibleUser('')).toBe(false);
  expect(isEligibleUser(undefined)).toBe(false);
});

test('Should update post score and calculate deltas correctly', async () => {
  // First update: should start at 0, delta = +5
  await updatePostScore('post1', 'userA', 5);
  
  let score = await redis.get('post:post1:score');
  expect(Number(score)).toBe(5);

  let author = await redis.get('post:post1:author');
  expect(author).toBe('userA');

  // Second update: new score is 8, delta should be +3
  await updatePostScore('post1', 'userA', 8);
  score = await redis.get('post:post1:score');
  expect(Number(score)).toBe(8);

  // Third update: new score is 6, delta should be -2
  await updatePostScore('post1', 'userA', 6);
  score = await redis.get('post:post1:score');
  expect(Number(score)).toBe(6);

  const leaderboard = await getLeaderboardData();
  // userA combined score should be 6
  const userACombined = leaderboard.combined.find(m => m.member === 'userA');
  expect(userACombined?.score).toBe(6);

  const userAPosts = leaderboard.posts.find(m => m.member === 'userA');
  expect(userAPosts?.score).toBe(6);
});

test('Should update comment score and separate categories', async () => {
  await updateCommentScore('comm1', 'userB', 10);
  
  const leaderboard = await getLeaderboardData();
  
  const userBComments = leaderboard.comments.find(m => m.member === 'userB');
  expect(userBComments?.score).toBe(10);

  const userBPosts = leaderboard.posts.find(m => m.member === 'userB');
  expect(userBPosts).toBeUndefined(); // userB has no posts

  const userBCombined = leaderboard.combined.find(m => m.member === 'userB');
  expect(userBCombined?.score).toBe(10);
});
