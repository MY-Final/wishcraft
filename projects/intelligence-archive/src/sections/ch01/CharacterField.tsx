import { randomSeed } from '../../lib/format';

/**
 * 等宽字符场：细网格上约 470 个低透明度字符，作为整章的「纸面」。
 * 生成是确定性的（固定种子），DOM 只渲染一次，滚动时整片字符场由 --p 轻微位移。
 */
const COLS = 30;
const ROWS = 16;

const POOL =
  "01{}[]()<>/\\|=+-*:;.,?!'\"&%$#@^~_¬∧∨→∀∃λΣ≡≤≥≠ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

interface Glyph {
  char: string;
  tier: 0 | 1 | 2;
}

const field: Glyph[] = (() => {
  const random = randomSeed(1950);
  const glyphs: Glyph[] = [];
  for (let index = 0; index < COLS * ROWS; index += 1) {
    const char = POOL[Math.floor(random() * POOL.length)] ?? '·';
    const roll = random();
    const tier: Glyph['tier'] = roll > 0.945 ? 2 : roll > 0.74 ? 1 : 0;
    glyphs.push({ char, tier });
  }
  return glyphs;
})();

export default function CharacterField() {
  return (
    <div className="ch01__chars" aria-hidden="true">
      {field.map((glyph, index) => (
        <span key={index} className={`ch01__char ch01__char--t${glyph.tier}`}>
          {glyph.char}
        </span>
      ))}
    </div>
  );
}
