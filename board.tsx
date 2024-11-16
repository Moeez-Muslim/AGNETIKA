import React from 'react';
import {
  Action,
  Agent,
  PendingActionEvent,
} from 'react-agents';
import { z } from 'zod';
import axios from 'axios';

import secrets from './secrets';

const TRELLO_API_KEY=secrets.TRELLO_API_KEY
const TRELLO_API_TOKEN=secrets.TRELLO_API_TOKEN
  
  // Utility: Fetch all boards
  const fetchTrelloBoards = async () => {
    try {
      const response = await axios.get('https://api.trello.com/1/members/me/boards', {
        params: {
          key: TRELLO_API_KEY,
          token: TRELLO_API_TOKEN,
        },
      });
      return response.data.map((board: any) => ({
        name: board.name,
        url: board.url,
      }));
    } catch (error) {
      console.error('Error fetching Trello boards:', error.response?.data || error.message);
      throw new Error('Failed to fetch Trello boards. Please try again.');
    }
  };

  const TrelloBoardAssistant = () => {
    return (
        <>
        {/* Fetch Boards Action */}
        <Action
            name="fetchTrelloBoards"
            description="Retrieve a list of all ongoing Trello projects (boards) for the user."
            schema={z.object({})} // No input required for this action
            examples={[{ userMessage: 'What are my ongoing projects?' }]}
            handler={async (e: PendingActionEvent) => {
            try {
                const boards = await fetchTrelloBoards();
                if (boards.length === 0) {
                await e.data.agent.monologue('It seems you have no ongoing projects at the moment.');
                } else {
                const monologueString = `Here are your ongoing projects:\n\n` + boards
                    .map((b, i) => `${i + 1}. ${b.name} - [Link](${b.url})`)
                    .join('\n');
                await e.data.agent.monologue(monologueString);
                }
            } catch (error) {
                await e.data.agent.monologue('There was an error fetching your Trello projects. Please try again later.');
            }
            await e.commit();
            }}
        />
    </>
);
};

export default TrelloBoardAssistant;
