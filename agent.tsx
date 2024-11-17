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

const TrelloAssistant = () => {
  return(
    <>
      <TrelloBoardAssistant/>
      <TrelloListAssistant/>
      <TrelloCardAssistant/>
      <PersonalAssistant/>
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
