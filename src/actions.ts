// Action type definitions for GS state management
import type { GameStateObj } from './types.js';

export type GSAction =
  | { type: 'SET_DEBT'; value: number }
  | { type: 'ADD_BITCOIN'; amount: number }
  | { type: 'SET_BITCOIN'; value: number }
  | { type: 'ADD_CASH'; amount: number }
  | { type: 'SET_CASH'; value: number }
  | { type: 'SET_COMBAT_RESULT'; result: string | null }
  | { type: 'ADD_BATTLE' }
  | { type: 'SET_SCREEN'; screen: string }
  | { type: 'SET_SETTINGS_RETURN'; from: string }
  | { type: 'SET_SELECTED_AREA'; area: string }
  | { type: 'SET_IS_NEW_GAME'; value: boolean }
  | { type: 'SET_EQUIPMENT'; equipment: GameStateObj['equipment'] }
  | { type: 'SET_QUICKBAR'; quickBar: GameStateObj['quickBar'] }
  | { type: 'SET_WAREHOUSE'; warehouse: GameStateObj['warehouse'] }
  | { type: 'SET_UPGRADES'; upgrades: string[] }
  | { type: 'ADD_UPGRADE'; upgradeId: string }
  | { type: 'SET_UNLOCKS'; unlocks: GameStateObj['unlocks'] }
  | { type: 'UNLOCK_RADIO' }
  | { type: 'UNLOCK_UNDERGROUND' }
  | { type: 'UNLOCK_AREA'; areaId: string }
  | { type: 'SET_MAILS_READ'; mailsRead: Record<string, boolean> }
  | { type: 'MARK_MAIL_READ'; mailId: string }
  | { type: 'SET_SETTINGS'; settings: GameStateObj['settings'] }
  | { type: 'SET_MASTER_VOLUME'; volume: number }
  | { type: 'SET_BGM_VOLUME'; volume: number }
  | { type: 'SET_SFX_VOLUME'; volume: number }
  | { type: 'SET_UI_SCALE'; scale: number }
  | { type: 'SET_CLIPPY_AGENT'; agent: string }
  | { type: 'SET_SHAKE_INTENSITY'; value: number }
  | { type: 'SET_CRT_FILTER'; value: number }
  | { type: 'RESET_GAME' }; // Full game reset to defaults
