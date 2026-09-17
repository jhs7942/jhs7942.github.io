import Image from "next/image";

type CloudAlphabetGreetingProps = {
  text: string;
};

const glyphDimensions = {
  A: [90, 89],
  D: [115, 95],
  E: [96, 98],
  F: [96, 98],
  G: [95, 91],
  H: [118, 99],
  I: [145, 95],
  L: [112, 152],
  M: [168, 96],
  N: [115, 96],
  O: [107, 137],
  R: [106, 133],
  T: [110, 164],
  V: [145, 165],
  W: [176, 152],
  ",": [52, 152],
  "!": [52, 152],
} as const;

/** 파일명으로 쓸 수 없는 문장부호는 영문 이름으로 바꿔 둔다. */
const glyphFileNames: Record<string, string> = {
  ",": "comma",
  "!": "exclam",
};

/** 제공받은 구름 알파벳 원본에서 추출한 로컬 글리프를 조합한 히어로 인사말. */
export function CloudAlphabetGreeting({ text }: CloudAlphabetGreetingProps) {
  return (
    <span className="cloud-alphabet-greeting" aria-hidden="true">
      {text.split(" ").map((word) => (
        <span className="cloud-alphabet-word" key={word}>
          {Array.from(word).map((character, index) => (
            <Image
              key={`${character}-${index}`}
              className="cloud-alphabet-glyph"
              src={`/portfolio/cloud-letters/${glyphFileNames[character] ?? character}.png`}
              alt=""
              width={glyphDimensions[character as keyof typeof glyphDimensions][0]}
              height={glyphDimensions[character as keyof typeof glyphDimensions][1]}
              loading="eager"
              unoptimized
            />
          ))}
        </span>
      ))}
    </span>
  );
}
