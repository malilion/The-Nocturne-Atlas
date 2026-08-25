export type StationQuestStep = 'sealed' | 'decoded' | 'accepted' | 'stamped' | 'arrived' | 'complete';
export type StationQuestLandmark = 'mountains' | 'ruins' | 'village';

export interface StationQuestContent {
  destination: string;
  landmarkId: StationQuestLandmark;
  notice: string;
  request: string;
  delivery: string;
  reward: string;
}

const STATION_QUESTS: readonly StationQuestContent[] = [
  {
    destination: 'Umbravale Pass',
    landmarkId: 'mountains',
    notice: 'Platform nine remains unlisted. Present the obsidian seal before 00:17.',
    request: 'Clerk Elyra asks you to carry a sealed timetable to the northern pass.',
    delivery: 'The pass warden waits beneath the monumental north gate. Deliver Elyra’s sealed timetable.',
    reward: 'Northern route complete · Umbravale service restored.',
  },
  {
    destination: 'Orison Memory Circle',
    landmarkId: 'ruins',
    notice: 'The Orison service waits until its memory lantern returns to the central dais.',
    request: 'Clerk Elyra entrusts you with the lantern register for the ruins archivist.',
    delivery: 'Place the lantern register beside the glass memory monolith for the ruins archivist.',
    reward: 'Memory route complete · Orison service restored.',
  },
  {
    destination: 'Lumen Row',
    landmarkId: 'village',
    notice: 'No luggage bearing a silver moth may cross the Veil after midnight.',
    request: 'Clerk Elyra asks you to deliver the moth-marked manifest to the village tavern.',
    delivery: 'The tavern keeper waits beyond the market fountain. Deliver the moth-marked manifest.',
    reward: 'Moonlit route complete · Lumen Row service restored.',
  },
] as const;

export function getStationQuest(seedHash: number) {
  return STATION_QUESTS[Math.abs(seedHash) % STATION_QUESTS.length];
}

export function advanceStationQuest(step: StationQuestStep): StationQuestStep {
  if (step === 'sealed') return 'decoded';
  if (step === 'decoded') return 'accepted';
  if (step === 'accepted') return 'stamped';
  if (step === 'stamped') return 'arrived';
  if (step === 'arrived') return 'complete';
  return 'complete';
}

export function getStationQuestCopy(step: StationQuestStep, quest: StationQuestContent) {
  if (step === 'sealed') return {
    progress: '1 / 5',
    body: 'A brass seal hides the final destination from ordinary passengers.',
    action: 'Decode departure board',
  };
  if (step === 'decoded') return {
    progress: '2 / 5',
    body: quest.notice,
    action: 'Ask Clerk Elyra',
  };
  if (step === 'accepted') return {
    progress: '3 / 5',
    body: quest.request,
    action: 'Claim passage stamp',
  };
  if (step === 'stamped') return {
    progress: '4 / 5',
    body: `Passage stamped. The courier route now leads to ${quest.destination}.`,
    action: `Travel to ${quest.destination}`,
  };
  if (step === 'arrived') return {
    progress: '5 / 5',
    body: quest.delivery,
    action: 'Complete delivery',
  };
  return {
    progress: 'Complete',
    body: quest.reward,
    action: null,
  };
}
