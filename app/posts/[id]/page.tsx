// 블로그 글 페이지 — publisher가 저장한 Post를 보여준다 (WordPress 준비 전 테스트용 발행처)
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

// 최대 1분마다 DB에서 다시 읽는다 (재발행 반영)
export const revalidate = 60;

// 빌드 때는 미리 만들지 않고, 첫 요청 때 생성해 캐시
export async function generateStaticParams() {
  return [];
}

// generateMetadata와 페이지가 같은 요청에서 DB를 두 번 읽지 않도록
const getPost = cache((id: string) => db.post.findUnique({ where: { id } }));

export async function generateMetadata({ params }: PageProps<"/posts/[id]">): Promise<Metadata> {
  const post = await getPost((await params).id);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    // 검수 전 글은 검색엔진에 노출하지 않는다
    robots: post.status === "published" ? undefined : { index: false, follow: false },
  };
}

export default async function PostPage({ params }: PageProps<"/posts/[id]">) {
  const post = await getPost((await params).id);
  if (!post) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← 놀자달력 홈
      </Link>
      {post.status !== "published" && (
        <p className="mt-4 rounded bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          검수 대기 중인 초안입니다.
        </p>
      )}
      <h1 className="mt-4 text-2xl font-bold leading-snug">{post.title}</h1>
      {/* composer가 만든 HTML (텍스트는 composer에서 이스케이프됨) */}
      <article className="post-body mt-6" dangerouslySetInnerHTML={{ __html: post.html }} />
    </main>
  );
}
