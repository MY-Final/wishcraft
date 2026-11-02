import Provenance from '../../components/common/Provenance';
import { useReveal } from '../../lib/use-reveal';
import { chatGpt, chatGptDate } from './ch04-data';
import { vars } from './vars';
import './Chat.css';

const QUESTION = '你能和我聊天吗？';
const ANSWER = '可以。你今天想聊些什么？';

const QUESTION_LEAD = 640;
const QUESTION_STEP = 100;
const ANSWER_LEAD = 2200;
const ANSWER_STEP = 78;

const WINDOW_COUNT = 120;

function splitChars(text: string, lead: number, step: number) {
  return Array.from(text).map((char, index) => ({
    char,
    delay: lead + index * step,
  }));
}

const questionChars = splitChars(QUESTION, QUESTION_LEAD, QUESTION_STEP);
const answerChars = splitChars(ANSWER, ANSWER_LEAD, ANSWER_STEP);

export default function ChatScene() {
  const revealRef = useReveal<HTMLDivElement>({ threshold: 0.06, rootMargin: '0px 0px -12% 0px' });

  return (
    <div className="chat" ref={revealRef}>
      <div className="chat__windows" aria-hidden="true">
        {Array.from({ length: WINDOW_COUNT }, (_, index) => (
          <span
            className="chat__window"
            key={index}
            style={vars({ '--t': ((index / WINDOW_COUNT) * 0.62).toFixed(4) })}
          />
        ))}
      </div>

      <div className="chat__inner">
        <div className="chat__ask">
          <span className="chat__ask-label u-mono">ASK</span>
          <p className="chat__ask-text u-cn">
            {questionChars.map(({ char, delay }, index) => (
              <span className="chat__char" key={`${char}-${index}`} style={vars({ '--d': `${delay}ms` })}>
                {char}
              </span>
            ))}
            <span className="chat__caret" aria-hidden="true" />
          </p>
        </div>

        <div className="chat__reply">
          <span className="chat__reply-label u-mono">MACHINE</span>
          <p className="chat__reply-text u-cn">
            {answerChars.map(({ char, delay }, index) => (
              <span className="chat__char" key={`${char}-${index}`} style={vars({ '--d': `${delay}ms` })}>
                {char}
              </span>
            ))}
          </p>
        </div>

        <div className="chat__stamp">
          <p className="chat__date u-mono">{chatGptDate}</p>
          <h3 className="chat__headline">
            <span>THE WORLD STARTED</span>
            <span>TALKING TO MACHINES.</span>
          </h3>
          <p className="chat__cn u-cn">从这一刻起，人工智能走进了大众生活。</p>
          <div className="chat__meta">
            <Provenance
              source={chatGpt?.sources[0]}
              status={chatGpt?.verificationStatus ?? 'verified'}
              date={chatGpt?.displayDate}
            />
            <p className="chat__note u-cn">示意性对话，非真实会话记录。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
