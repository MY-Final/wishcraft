import YearRail from '../components/YearRail';
import {
  Chapter01,
  Chapter02,
  Chapter03,
  Chapter04,
  Chapter05,
  Chapter06,
  Chapter07,
  Finale,
  Prologue,
} from '../sections';
import NarrativeCanvas from '../three/NarrativeCanvas';
import './NarrativeView.css';

export default function NarrativeView(_props: { targetChapter?: number }) {
  return (
    <div className="narrative-view">
      <NarrativeCanvas />
      <YearRail />
      <main id="narrative" className="narrative">
        <Prologue />
        <Chapter01 />
        <Chapter02 />
        <Chapter03 />
        <Chapter04 />
        <Chapter05 />
        <Chapter06 />
        <Chapter07 />
        <Finale />
      </main>
    </div>
  );
}
