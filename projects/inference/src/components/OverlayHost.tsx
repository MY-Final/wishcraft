import { useJourney } from '../lib/journey-store';
import DeepDiveDialog from './DeepDiveDialog';
import FieldNotesDialog from './FieldNotesDialog';
import InfoDialog from './InfoDialog';
import TokenDialog from './TokenDialog';

export default function OverlayHost() {
  const snapshot = useJourney();

  return (
    <>
      <InfoDialog infoId={snapshot.infoId} />
      <TokenDialog tokenIndex={snapshot.tokenInspect} />
      <DeepDiveDialog stage={snapshot.deepDiveStage} />
      <FieldNotesDialog open={snapshot.notesOpen} />
    </>
  );
}
