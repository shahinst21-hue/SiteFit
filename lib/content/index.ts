import { localPosts } from "./posts.ts";
import { createLocalRepository } from "./repository.ts";

// Read-only boundary. Replace this implementation, not article/index page components.
export const contentRepository = createLocalRepository(localPosts);
