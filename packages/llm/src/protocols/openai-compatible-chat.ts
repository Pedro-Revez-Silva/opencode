import { Effect, Schema } from "effect"
import { Route, type RouteRoutedModelInput } from "../route/client"
import { Endpoint } from "../route/endpoint"
import { Framing } from "../route/framing"
import { Protocol } from "../route/protocol"
import { isRecord } from "./shared"
import * as OpenAIChat from "./openai-chat"

const ADAPTER = "openai-compatible-chat"

export type OpenAICompatibleChatModelInput = RouteRoutedModelInput

const OpenAICompatibleChatBody = Schema.StructWithRest(
  Schema.Struct({ ...OpenAIChat.bodyFields, reasoning_effort: Schema.optional(Schema.String) }),
  [Schema.Record(Schema.String, Schema.Any)],
)
export type OpenAICompatibleChatBody = Schema.Schema.Type<typeof OpenAICompatibleChatBody>

const bodyOptions = (options: unknown) => {
  if (!isRecord(options)) return {}
  const { reasoningEffort, textVerbosity, strictJsonSchema: _strictJsonSchema, ...rest } = options
  return {
    ...rest,
    ...(typeof reasoningEffort === "string" ? { reasoning_effort: reasoningEffort } : {}),
    ...(typeof textVerbosity === "string" ? { verbosity: textVerbosity } : {}),
  }
}

export const protocol = Protocol.make({
  id: ADAPTER,
  body: {
    schema: OpenAICompatibleChatBody,
    from: (request) =>
      OpenAIChat.protocol.body.from(request).pipe(
        Effect.map(
          (body) =>
            ({
              ...body,
              ...bodyOptions(request.providerOptions?.[request.model.provider]),
            }) as OpenAICompatibleChatBody,
        ),
      ),
  },
  stream: OpenAIChat.protocol.stream,
})

/**
 * Route for non-OpenAI providers that expose an OpenAI Chat-compatible
 * `/chat/completions` endpoint. Reuses OpenAI Chat streaming behavior while
 * allowing compatible providers to pass through additional request-body
 * options such as `enable_thinking` and extended reasoning efforts.
 */
export const route = Route.make({
  id: ADAPTER,
  protocol,
  endpoint: Endpoint.path("/chat/completions"),
  framing: Framing.sse,
})

export * as OpenAICompatibleChat from "./openai-compatible-chat"
