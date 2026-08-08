import { z } from "zod";
import { SERIES, isSeriesKey } from "./series";

/**
 * 글 frontmatter 스키마.
 *
 * TypeScript 타입만으로는 .md 파일을 검사할 수 없다. gray-matter가 돌려주는 data는
 * 컴파일 시점에 내용을 알 수 없는 값이라, `as Post` 단언은 확인이 아니라 선언에 그친다.
 * 그래서 파일을 읽는 시점에 런타임 검증을 걸고, 어긋나면 빌드를 세운다.
 *
 * 이 스키마가 막는 것은 "조용한 누락"이다. labels를 label로 오타 내면 에러 없이
 * 그 글만 태그 페이지에서 사라지는데, 그런 실패는 배포 후에야 눈으로 발견된다.
 */
export const postSchema = z
  .object({
    title: z.string().min(1),

    /** URL이 된다: /posts/{slug}/ — 파일명에서 날짜를 뗀 값 */
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "소문자·숫자·하이픈만 (양끝/연속 하이픈 불가)"),

    /**
     * 본문의 SUMMARY에서 승격. OG description·목록 요약에 그대로 쓴다.
     *
     * 상한 400은 폭주 방지선이다. CLAUDE.md의 "300자 이내"는 글을 쓸 때의 지침이라
     * 스키마가 아니라 마이그레이션 경고로 다룬다(현재 5편이 301~353자).
     */
    description: z.string().min(1).max(400),

    /** 오프셋을 포함한 ISO 8601. 정렬과 sitemap lastmod의 기준. */
    published_at: z.iso.datetime({ offset: true }),

    labels: z.array(z.string().min(1)).min(1),

    /** 원본 소재 경로. 미발행 소재 스캔이 이 값으로 중복을 걸렀다. */
    source: z.string().default(""),

    /** 2탭 분할 키워드. 4편만 사용. */
    tabs: z.string().optional(),

    /** 시리즈 소속. series와 part는 반드시 함께 온다. */
    series: z.string().refine(isSeriesKey, "series.ts에 등록되지 않은 키").optional(),
    part: z.number().int().positive().optional(),

    /** 이전 blogspot 주소. 리다이렉트가 불가능하므로 기록 목적으로만 남긴다. */
    legacy_url: z.string().url().optional(),

    draft: z.boolean().default(false),
  })
  .refine((v) => (v.series === undefined) === (v.part === undefined), {
    message: "series와 part는 함께 있거나 함께 없어야 한다",
    path: ["part"],
  })
  .refine(
    (v) => v.series === undefined || v.part! <= SERIES[v.series as keyof typeof SERIES].total,
    { message: "part가 시리즈 총 편수를 넘는다", path: ["part"] },
  );

export type Post = z.infer<typeof postSchema>;

/** 검증 실패를 파일명과 함께 읽을 수 있는 한 줄로 만든다. */
export function formatIssues(file: string, error: z.ZodError): string {
  return error.issues
    .map((i) => `  ${file}  [${i.path.join(".") || "(root)"}] ${i.message}`)
    .join("\n");
}
