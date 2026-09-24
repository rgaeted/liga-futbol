import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

let client: S3Client | null = null

export function readR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null
  return { accountId, accessKeyId, secretAccessKey, bucket }
}

function getClient(config: R2Config): S3Client {
  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  return client
}

export async function uploadR2Object(
  path: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const config = readR2Config()
  if (!config) throw new Error('R2 no configurado')
  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: path,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
}

export async function deleteR2Objects(paths: string[]): Promise<void> {
  const config = readR2Config()
  if (!config) throw new Error('R2 no configurado')
  const s3 = getClient(config)
  await Promise.all(
    paths.map((path) =>
      s3.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: path,
        }),
      ),
    ),
  )
}
