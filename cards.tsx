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

// Utility: Fetch members of a board
const fetchBoardMembers = async (boardId: string) => {
    try {
      const response = await axios.get(`https://api.trello.com/1/boards/${boardId}/members`, {
        params: {
          key: TRELLO_API_KEY,
          token: TRELLO_API_TOKEN,
        },
      });
      return response.data.reduce((map, member) => {
        map[member.fullName.toLowerCase()] = member.id;
        return map;
      }, {} as Record<string, string>);
    } catch (error) {
      console.error('Error fetching board members:', error.response?.data || error.message);
      throw new Error('Could not fetch board members. Please try again later.');
    }
  };

  
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

// Utility: Assign a member to a card
const assignMemberToCard = async (cardId: string, memberId: string) => {
    try {
      const response = await axios.post(
        `https://api.trello.com/1/cards/${cardId}/idMembers`,
        null,
        {
          params: {
            value: memberId,
            key: TRELLO_API_KEY,
            token: TRELLO_API_TOKEN,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error assigning member:', error.response?.data || error.message);
      throw new Error('Failed to assign the member. Please try again.');
    }
  };

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

  // Utility: Move a card to another list
const moveCardToList = async (cardId: string, targetListId: string) => {
    try {
      const response = await axios.put(
        `https://api.trello.com/1/cards/${cardId}`,
        null,
        {
          params: {
            idList: targetListId,
            key: TRELLO_API_KEY,
            token: TRELLO_API_TOKEN,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error moving card:', error.response?.data || error.message);
      throw new Error('Failed to move the card. Please try again.');
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

      {/* Assign Task Action */}
      <Action
        name="assignTrelloTask"
        description="Assigns a task (card) to a specific member in a Trello board."
        schema={z.object({
          boardName: z.string(),
          listName: z.string(),
          cardName: z.string(),
          memberName: z.string(),
        })}
        examples={[
          { boardName: 'Agentika', listName: 'To-Do', cardName: 'Finish documentation', memberName: 'John Doe' },
          { boardName: 'Project Management', listName: 'In Progress', cardName: 'Update designs', memberName: 'Jane Smith' },
        ]}
        handler={async (e: PendingActionEvent) => {
            const { boardName, sourceListName, targetListName, cardName } = e.data.message.args as {
              boardName: string;
              sourceListName: string;
              targetListName: string;
              cardName: string;
            };
          
            try {
              // Match board name to ID
              const boardId = await fetchBoardNameToIdMap().then(map => map[boardName.toLowerCase()]);
              if (!boardId) {
                await e.data.agent.monologue(`I couldn't find a board named "${boardName}".`);
                await e.commit();
                return;
              }
          
              // Match source and target list names to IDs
              const listNameToIdMap = await fetchListsInBoard(boardId);
              console.log('Lists in board:', listNameToIdMap);
          
              const sourceListId = listNameToIdMap[sourceListName.toLowerCase()];
              const targetListId = listNameToIdMap[targetListName.toLowerCase()];
          
              if (!sourceListId || !targetListId) {
                await e.data.agent.monologue(`I couldn't find the lists "${sourceListName}" or "${targetListName}".`);
                await e.commit();
                return;
              }
          
              // Match card name to ID in the source list
              const cardNameToIdMap = await fetchCardsInList(sourceListId);
              console.log('Cards in source list:', cardNameToIdMap);
          
              const cardId = cardNameToIdMap[cardName.toLowerCase()];
              if (!cardId) {
                await e.data.agent.monologue(`I couldn't find the card "${cardName}" in the "${sourceListName}" list.`);
                await e.commit();
                return;
              }
          
              // Move the card
              await moveCardToList(cardId, targetListId);
              await e.data.agent.monologue(
                `Successfully moved the card "${cardName}" from "${sourceListName}" to "${targetListName}" in the "${boardName}" board!`
              );
            } catch (error) {
              console.error('Error moving card:', error);
              await e.data.agent.monologue('There was an error moving the card. Please try again.');
            }
          
            await e.commit();
          }}
          
      />

      {/* Move Card Action */}
      <Action
        name="moveTrelloCard"
        description="Moves a card from one list to another within the same Trello board."
        schema={z.object({
          boardName: z.string(),
          sourceListName: z.string(),
          targetListName: z.string(),
          cardName: z.string(),
        })}
        examples={[
          {
            boardName: 'Agentika',
            sourceListName: 'To-Do',
            targetListName: 'In Progress',
            cardName: 'Finish documentation',
          },
          {
            boardName: 'Project Management',
            sourceListName: 'Backlog',
            targetListName: 'Completed',
            cardName: 'Submit report',
          },
        ]}
        handler={async (e: PendingActionEvent) => {
          const { boardName, sourceListName, targetListName, cardName } = e.data.message.args as {
            boardName: string;
            sourceListName: string;
            targetListName: string;
            cardName: string;
          };

          // Match board name to ID
          const boardId = await fetchBoardNameToIdMap().then(map => map[boardName.toLowerCase()]);
          if (!boardId) {
            await e.data.agent.monologue(
              `I couldn't find a board named "${boardName}". Please check the name and try again.`
            );
            await e.commit();
            return;
          }

          // Match source and target list names to IDs
          let sourceListId: string | undefined;
          let targetListId: string | undefined;
          try {
            const listNameToIdMap = await fetchListsInBoard(boardId);
            sourceListId = listNameToIdMap[sourceListName.toLowerCase()];
            targetListId = listNameToIdMap[targetListName.toLowerCase()];
          } catch {
            await e.data.agent.monologue(
              `There was an error retrieving lists for the "${boardName}" board. Please try again.`
            );
            await e.commit();
            return;
          }

          if (!sourceListId || !targetListId) {
            await e.data.agent.monologue(
              `I couldn't find the lists "${sourceListName}" or "${targetListName}" in the "${boardName}" board. Please check the names and try again.`
            );
            await e.commit();
            return;
          }

          // Match card name to ID in the source list
          let cardId: string | undefined;
          try {
            const cardNameToIdMap = await fetchCardsInList(sourceListId);
            cardId = cardNameToIdMap[cardName.toLowerCase()];
          } catch {
            await e.data.agent.monologue(
              `There was an error retrieving cards in the "${sourceListName}" list. Please try again.`
            );
            await e.commit();
            return;
          }

          if (!cardId) {
            await e.data.agent.monologue(
              `I couldn't find a card named "${cardName}" in the "${sourceListName}" list. Please check the name and try again.`
            );
            await e.commit();
            return;
          }

          // Move the card
          try {
            await moveCardToList(cardId, targetListId);
            await e.data.agent.monologue(
              `Successfully moved the card "${cardName}" from "${sourceListName}" to "${targetListName}" in the "${boardName}" board!`
            );
          } catch (error) {
            await e.data.agent.monologue('There was an error moving the card. Please try again.');
          }

          await e.commit();
        }}
      />
    </>
  );
};

export default TrelloCardAssistant;
