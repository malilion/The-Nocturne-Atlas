export type StationQuestStep = 'sealed' | 'decoded' | 'accepted' | 'complete';

export interface StationQuestContent {
  destination: string;
  notice: string;
  request: string;
  reward: string;
}

const STATION_QUESTS: readonly StationQuestContent[] = [
  {
    destination: 'Umbravale Pass',
    notice: 'Platform nine remains unlisted. Present the obsidian seal before 00:17.',
    request: 'Clerk Elyra asks you to carry a sealed timetable to the northern pass.',
    reward: 'Obsidian passage stamped · Umbravale service authorized.',
  },
  {
    destination: 'Orison Memory Circle',
    notice: 'The Orison service waits until its memory lantern returns to the central dais.',
    request: 'Clerk Elyra entrusts you with the lantern register for the ruins archivist.',
    reward: 'Memory passage stamped · Orison service authorized.',
  },
  {
    destination: 'Lumen Row',
    notice: 'No luggage bearing a silver moth may cross the Veil after midnight.',
    request: 'Clerk Elyra asks you to deliver the moth-marked manifest to the village tavern.',
    reward: 'Moonlit passage stamped · Lumen Row service authorized.',
  },
] as const;

export function getStationQuest(seedHash: number) {
  return STATION_QUESTS[Math.abs(seedHash) % STATION_QUESTS.length];
}

export function advanceStationQuest(step: StationQuestStep): StationQuestStep {
  if (step === 'sealed') return 'decoded';
  if (step === 'decoded') return 'accepted';
  if (step === 'accepted') return 'complete';
  return 'complete';
}

export function getStationQuestCopy(step: StationQuestStep, quest: StationQuestContent) {
  if (step === 'sealed') return {
    progress: '1 / 3',
    body: 'A brass seal hides the final destination from ordinary passengers.',
    action: 'Decode departure board',
  };
  if (step === 'decoded') return {
    progress: '2 / 3',
    body: quest.notice,
    action: 'Ask Clerk Elyra',
  };
  if (step === 'accepted') return {
    progress: '3 / 3',
    body: quest.request,
    action: 'Claim passage stamp',
  };
  return {
    progress: 'Complete',
    body: quest.reward,
    action: null,
  };
}
