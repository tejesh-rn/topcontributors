import { context } from '@devvit/web/server';
import { Hono } from 'hono';
import type { 
  OnAppInstallRequest, 
  OnPostSubmitRequest, 
  OnCommentSubmitRequest, 
  OnPostUpdateRequest, 
  OnCommentUpdateRequest, 
  TriggerResponse 
} from '@devvit/web/shared';

import { createPost } from '../core/post';
import { updatePostScore, updateCommentScore } from '../core/leaderboard';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();

    const input = await c.req.json<OnAppInstallRequest>();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${post.id} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});

triggers.post('/on-post-submit', async (c) => {
  try {
    const event = await c.req.json<OnPostSubmitRequest>();
    const postId = event.post?.id;
    const authorName = event.author?.name;

    if (postId && authorName) {
      await updatePostScore(postId, authorName, 1);
    }

    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error(`Error handling on-post-submit: ${error}`);
    return c.json<TriggerResponse>({ status: 'error' }, 400);
  }
});

triggers.post('/on-comment-submit', async (c) => {
  try {
    const event = await c.req.json<OnCommentSubmitRequest>();
    const commentId = event.comment?.id;
    const authorName = event.author?.name || event.comment?.author;

    if (commentId && authorName) {
      await updateCommentScore(commentId, authorName, 1);
    }

    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error(`Error handling on-comment-submit: ${error}`);
    return c.json<TriggerResponse>({ status: 'error' }, 400);
  }
});

triggers.post('/on-post-update', async (c) => {
  try {
    const event = await c.req.json<OnPostUpdateRequest>();
    const postId = event.post?.id;
    const authorName = event.author?.name;
    const score = event.post?.score;

    if (postId && authorName && score !== undefined) {
      await updatePostScore(postId, authorName, score);
    }

    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error(`Error handling on-post-update: ${error}`);
    return c.json<TriggerResponse>({ status: 'error' }, 400);
  }
});

triggers.post('/on-comment-update', async (c) => {
  try {
    const event = await c.req.json<OnCommentUpdateRequest>();
    const commentId = event.comment?.id;
    const authorName = event.author?.name || event.comment?.author;
    const score = event.comment?.score;

    if (commentId && authorName && score !== undefined) {
      await updateCommentScore(commentId, authorName, score);
    }

    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error(`Error handling on-comment-update: ${error}`);
    return c.json<TriggerResponse>({ status: 'error' }, 400);
  }
});
