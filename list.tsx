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
  
  // Utility: Fetch all cards in a list
  const fetchCardsInList = async (listId: string) => {
    try {
      const response = await axios.get(`https://api.trello.com/1/lists/${listId}/cards`, {
        params: {
          key: TRELLO_API_KEY,
          token: TRELLO_API_TOKEN,
        },
      });
      return response.data.map((card: any) => ({
        name: card.name,
        url: card.url,
      }));
    } catch (error) {
      console.error('Error fetching cards for list:', error.response?.data || error.message);
      throw new Error('Could not fetch cards. Please try again later.');
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

        {/* Fetch Cards in a List Action */}
        <Action
            name="fetchTrelloCards"
            description="Retrieves all tasks (cards) in a specified Trello list."
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

            // Fetch cards in the list
            try {
                const cards = await fetchCardsInList(listId);
                if (cards.length === 0) {
                await e.data.agent.monologue(`The list "${listName}" is currently empty.`);
                } else {
                const monologueString = `Here are the tasks in the "${listName}" list:\n\n` + cards
                    .map((card, i) => `${i + 1}. ${card.name} - [Link](${card.url})`)
                    .join('\n');
                await e.data.agent.monologue(monologueString);
                }
            } catch (error) {
                await e.data.agent.monologue('There was an error fetching tasks. Please try again.');
            }

            await e.commit();
            }}
        />
      </>
    );
  };
  
export default TrelloListAssistant;