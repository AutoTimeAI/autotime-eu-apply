export interface SourceArchiveClient {
  storage: { from(bucket: string): { upload(path: string, content: string, options: { contentType: string; upsert: boolean }): PromiseLike<{ data: { path?: string } | null; error: unknown }> } }
}

export async function archiveOfficialSource({ client, sourceDocumentId, content, contentType, rawSha256, capturedAt }: {
  client: SourceArchiveClient; sourceDocumentId: string; content: string; contentType: string; rawSha256: string; capturedAt: string
}): Promise<string> {
  const safeTime = capturedAt.replaceAll(":", "-")
  const path = `${sourceDocumentId}/${safeTime}-${rawSha256}.snapshot`
  const result = await client.storage.from("mobility-source-snapshots").upload(path, content, { contentType, upsert: false })
  if (result.error || !result.data?.path) throw new Error("Official source snapshot could not be archived")
  return `supabase-storage://mobility-source-snapshots/${result.data.path}`
}
