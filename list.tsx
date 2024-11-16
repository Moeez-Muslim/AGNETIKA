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

// Utility: Fetch all boards and map their names to IDs
const fetchBoardNameToIdMap = async () => {
    try {
      const response = await axios.get('https://api.trello.com/1/members/me/boards', {
        params: {
          key: TRELLO_API_KEY,
          token: TRELLO_API_TOKEN,
        },
      });
      return response.data.reduce((map, board) => {
        map[board.name.toLowerCase()] = board.id;
        return map;
      }, {} as Record<string, string>);
    } catch (error) {
      console.error('Error fetching boards for mapping:', error.response?.data || error.message);
      throw new Error('Could not fetch boards. Please try again later.');
    }
  };
  
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
  
  // Utility: Create a list in a Trello board
  const createListInBoard = async (boardId: string, listName: string) => {
    try {
      const response = await axios.post(
        'https://api.trello.com/1/lists',
        null,
        {
          params: {
            name: listName,
            idBoard: boardId,
            key: TRELLO_API_KEY,
            token: TRELLO_API_TOKEN,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating list:', error.response?.data || error.message);
      throw new Error('Failed to create the list. Please try again.');
    }
  };
  
  const TrelloListAssistant = () => {
    // In-memory board name to ID mapping
    let boardNameToIdMap: Record<string, string> = {};
  
    // Fetch and store the board name-to-ID map on component load
    React.useEffect(() => {
      const loadBoardMap = async () => {
        boardNameToIdMap = await fetchBoardNameToIdMap();
      };
      loadBoardMap();
    }, []);
  
    return (
      <>
        {/* Create List Action */}
        <Action
          name="createTrelloList"
          description="Creates a new list in a specified Trello board by name."
          schema={z.object({
            boardName: z.string(),
            listName: z.string()
          })}
          examples={[
            { boardName: 'Agentika', listName: 'To-Do' },
            { boardName: 'Project Management', listName: 'Backlog' },
          ]}
          handler={async (e: PendingActionEvent) => {
            const { boardName, listName } = e.data.message.args as {
              boardName: string;
              listName: string;
            };
  
            // Match board name to ID
            const boardId = boardNameToIdMap[boardName.toLowerCase()];
            if (!boardId) {
              await e.data.agent.monologue(
                `I couldn't find a board named "${boardName}". Please check the name and try again.`
              );
              await e.commit();
              return;
            }
  
            // Create the list
            try {
              const createdList = await createListInBoard(boardId, listName);
              await e.data.agent.monologue(
                `Successfully created the list "${listName}" in the "${boardName}" board!`
              );
            } catch (error) {
              await e.data.agent.monologue('There was an error creating the list. Please try again.');
            }
  
            await e.commit();
          }}
        />
      </>
    );
  };
  
export default TrelloListAssistant;