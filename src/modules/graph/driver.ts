/** Memgraph 드라이버 싱글턴 — neo4j-driver로 Bolt 프로토콜 연결 */

import neo4j, { type Driver, type Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error('Memgraph 환경변수 누락: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 5000,
    });
  }
  return driver;
}

export function getSession(): Session {
  return getDriver().session();
}

/** 쿼리 실행 헬퍼 */
export async function runQuery<T = unknown>(
  cypher: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject()) as T[];
  } finally {
    await session.close();
  }
}

/** 스키마 초기화 — 인덱스 생성 (Memgraph 첫 연결 시 1회) */
let schemaInitialized = false;

export async function initSchema(): Promise<void> {
  if (schemaInitialized) return;

  const indexes = [
    'CREATE INDEX ON :Domain(id)',
    'CREATE INDEX ON :Domain(name)',
    'CREATE INDEX ON :Topic(id)',
    'CREATE INDEX ON :Idea(id)',
    'CREATE INDEX ON :Idea(phase)',
    'CREATE INDEX ON :Idea(createdAt)',
    'CREATE INDEX ON :Artifact(id)',
    'CREATE INDEX ON :Concept(id)',
    'CREATE INDEX ON :Concept(name)',
    'CREATE INDEX ON :Session(id)',
    'CREATE INDEX ON :Agent(id)',
  ];

  for (const cypher of indexes) {
    try {
      await runQuery(cypher);
    } catch {
      // 인덱스가 이미 있으면 무시
    }
  }

  schemaInitialized = true;
}

/** 연결 확인 + 스키마 초기화 */
export async function ensureConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const result = await runQuery('RETURN 1 as ok');
    if (result.length > 0) {
      await initSchema();
      return { connected: true };
    }
    return { connected: false, error: 'Empty result from ping query' };
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** 드라이버 종료 (앱 종료 시) */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    schemaInitialized = false;
  }
}
