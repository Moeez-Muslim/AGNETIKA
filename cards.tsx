import React from 'react';
import {
  Action,
  PendingActionEvent,
} from 'react-agents';
import { z } from 'zod';
import axios from 'axios';
import secrets from './secrets';

const TRELLO_API_KEY = secrets.TRELLO_API_KEY;
const TRELLO_API_TOKEN = secrets.TRELLO_API_TOKEN;

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

// Utility: Fetch all lists in a board
const fetchListsInBoard = async (boardId: string) => {
  try {
    const response = await axios.get(`https://api.trello.com/1/boards/${boardId}/lists`, {
      params: {
        key: TRELLO_API_KEY,
        token: TRELLO_API_TOKEN,
      },
    });
    return response.data.reduce((map, list) => {
      map[list.name.toLowerCase()] = list.id;
      return map;
    }, {} as Record<string, string>);
  } catch (error) {
    console.error('Error fetching lists for board:', error.response?.data || error.message);
    throw new Error('Could not fetch lists. Please try again later.');
  }
};

// Utility: Create a card in a list
const createCardInList = async (listId: string, cardName: string) => {
  try {
    const response = await axios.post(
      'https://api.trello.com/1/cards',
      null,
      {
        params: {
          name: cardName,
          idList: listId,
          key: TRELLO_API_KEY,
          token: TRELLO_API_TOKEN,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating card:', error.response?.data || error.message);
    throw new Error('Failed to create the card. Please try again.');
  }
};

const TrelloCardAssistant = () => {
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
      {/* Add Card Action */}
      <Action
        name="addTrelloCard"
        description="Adds a new card to a specified list in a Trello board."
        schema={z.object({
          boardName: z.string(),
          listName: z.string(),
          cardName: z.string(),
        })}
        examples={[
          { boardName: 'Agentika', listName: 'To-Do', cardName: 'Finish documentation' },
          { boardName: 'Project Management', listName: 'In Progress', cardName: 'Update designs' },
        ]}
        handler={async (e: PendingActionEvent) => {
          const { boardName, listName, cardName } = e.data.message.args as {
            boardName: string;
            listName: string;
            cardName: string;
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

          // Match list name to ID
          let listId: string | undefined;
          try {
            const listNameToIdMap = await fetchListsInBoard(boardId);
            listId = listNameToIdMap[listName.toLowerCase()];
          } catch {
            await e.data.agent.monologue(
              `There was an error retrieving lists for the "${boardName}" board. Please try again.`
            );
            await e.commit();
            return;
          }

          if (!listId) {
            await e.data.agent.monologue(
              `I couldn't find a list named "${listName}" in the "${boardName}" board. Please check the name and try again.`
            );
            await e.commit();
            return;
          }

          // Create the card
          try {
            const createdCard = await createCardInList(listId, cardName);
            await e.data.agent.monologue(
              `Successfully created the card "${cardName}" in the "${listName}" list of the "${boardName}" board!`
            );
          } catch (error) {
            await e.data.agent.monologue('There was an error creating the card. Please try again.');
          }

          await e.commit();
        }}
      />
    </>
  );
};

export default TrelloCardAssistant;
