import React from 'react';
import {
  Action,
  Agent,
  PendingActionEvent,
} from 'react-agents';
import { z } from 'zod';
import axios from 'axios';
import TrelloBoardAssistant from './board'
import TrelloListAssistant from './list';
import TrelloCardAssistant from './cards';
import PersonalAssistant from './meetings';
import TrelloProjectAssistant from './project';

const TrelloAssistant = () => {
  return(
    <>
      <TrelloBoardAssistant/>
      <TrelloListAssistant/>
      <TrelloCardAssistant/>
      <PersonalAssistant/>
      <TrelloProjectAssistant/>
    </>
  )
}

export default function MyAgent() {
  return (
    <Agent>
      <TrelloAssistant/>
    </Agent>
  );
}
