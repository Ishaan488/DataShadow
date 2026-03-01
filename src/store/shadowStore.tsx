import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ShadowState, ShadowEvent, Entity, EntityEdge, RiskScore, ThreatNarrative, UploadedFile } from '../core/types';

// Actions
type Action =
    | { type: 'SET_PROCESSING'; step: string }
    | { type: 'SET_DONE' }
    | { type: 'ADD_FILES'; files: UploadedFile[] }
    | { type: 'SET_EVENTS'; events: ShadowEvent[] }
    | { type: 'SET_ENTITIES'; entities: Entity[]; edges: EntityEdge[] }
    | { type: 'SET_RISK_SCORE'; score: RiskScore }
    | { type: 'SET_THREATS'; threats: ThreatNarrative[] }
    | { type: 'SET_API_KEY'; key: string }
    | { type: 'SET_ANALYZED' }
    | { type: 'RESET' };

const initialState: ShadowState = {
    files: [],
    events: [],
    entities: [],
    edges: [],
    riskScore: null,
    threats: [],
    apiKey: '',
    isProcessing: false,
    currentStep: '',
    isAnalyzed: false,
};

function reducer(state: ShadowState, action: Action): ShadowState {
    switch (action.type) {
        case 'SET_PROCESSING':
            return { ...state, isProcessing: true, currentStep: action.step };
        case 'SET_DONE':
            return { ...state, isProcessing: false, currentStep: '' };
        case 'ADD_FILES':
            return { ...state, files: [...state.files, ...action.files] };
        case 'SET_EVENTS':
            return { ...state, events: action.events };
        case 'SET_ENTITIES':
            return { ...state, entities: action.entities, edges: action.edges };
        case 'SET_RISK_SCORE':
            return { ...state, riskScore: action.score };
        case 'SET_THREATS':
            return { ...state, threats: action.threats };
        case 'SET_API_KEY':
            return { ...state, apiKey: action.key };
        case 'SET_ANALYZED':
            return { ...state, isAnalyzed: true };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

const ShadowContext = createContext<{
    state: ShadowState;
    dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => { } });

export function ShadowProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    return (
        <ShadowContext.Provider value={{ state, dispatch }}>
            {children}
        </ShadowContext.Provider>
    );
}

export function useShadow() {
    return useContext(ShadowContext);
}
