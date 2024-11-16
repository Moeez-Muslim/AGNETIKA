import React from 'react';
import {
  Action,
  Agent,
  PendingActionEvent,
} from 'react-agents';
import { z } from 'zod';
import dedent from 'dedent';
import axios from 'axios';

// .env not working so had to move these here
const TRELLO_API_KEY=`4ac1a8b865a98616faf469e4c7e5c78e`
const TRELLO_API_TOKEN=`ATTA28c8061a4879ea1dac0523e7e2ee514ccdef54f9efbc97c5f0ae7caf3f9560b95DF4DD21`
const TRELLO_API_BASE = `https://api.trello.com/1`;
//

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
    throw new Error('Failed to fetch Trello boards. Please check your credentials and try again.');
  }
};

const TrelloBoardAssistant = () => {
  return (
    <>
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
              const monologueString = dedent`\
                Here are your ongoing projects:
              ` + '\n\n' + boards.map((b, i) => `${i + 1}. ${b.name} - [Link](${b.url})`).join('\n');
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

export default function MyAgent() {
  return (
    <Agent>
      <TrelloBoardAssistant />
    </Agent>
  );
}
