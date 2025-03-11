import { defineConfig } from "@hey-api/openapi-ts";
import { defaultPlugins } from '@hey-api/openapi-ts';

interface Operation {
  id: string;
  tags?: string[];
}

function buildMethodName(operation: Operation): string {
  let name = operation.id;
  const prefix = operation.tags?.[0];
  if (prefix && name.toLowerCase().startsWith(prefix.toLowerCase())) {
    name = name.slice(prefix.length);
  }
  name = name.trim();
  if (!name) {
    name = operation.id;
  }
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export default defineConfig({
  input: "./openapi.json",
  output: "./src/client",
  // @ts-ignore
  plugins: [
    ...defaultPlugins,
    "@tanstack/react-query",
    "@hey-api/client-fetch",
    {
      name: "@hey-api/sdk",
      asClass: true,
      operationId: true,
      methodNameBuilder: buildMethodName,
    },
  ],
});
