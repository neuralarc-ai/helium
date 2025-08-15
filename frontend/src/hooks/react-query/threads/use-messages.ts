import { createMutationHook, createQueryHook } from "@/hooks/use-query";
import { threadKeys } from "./keys";
import { addUserMessage, getMessages } from "@/lib/api";

export const useMessagesQuery = (threadId: string) =>
  createQueryHook(
    threadKeys.messages(threadId),
    () => getMessages(threadId),
    {
      enabled: !!threadId,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 0, // Always consider data stale to ensure fresh content
      gcTime: 5 * 60 * 1000, // 5 minutes
    }
  )();

export const useAddUserMessageMutation = () =>
  createMutationHook(
    ({
      threadId,
      message,
    }: {
      threadId: string;
      message: string;
    }) => addUserMessage(threadId, message)
  )();
