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


  const fetchCardsInList = async (listId: string): Promise<Record<string, string>> => {
    try {
      const response = await axios.get(`https://api.trello.com/1/lists/${listId}/cards`, {
        params: {
          key: TRELLO_API_KEY,
          token: TRELLO_API_TOKEN,
        },
      });
  
      // Transforming response to a map of card names (lowercased) to IDs
      const cardNameToIdMap = response.data.reduce((map: Record<string, string>, card: any) => {
        map[card.name.toLowerCase()] = card.id; // Use the card's ID here
        return map;
      }, {});
  
      console.log('Card name-to-ID map:', cardNameToIdMap); // Debug: Log the mapping
      return cardNameToIdMap;
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

  const assignMemberToCard = async (cardId: string, memberId: string) => {
    try {
      const response = await axios.post(
        `https://api.trello.com/1/cards/${cardId}/idMembers`,
        null,
        {
          params: {
            key: TRELLO_API_KEY,
            token: TRELLO_API_TOKEN,
            value: memberId,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error assigning member to card:', error.response?.data || error.message);
      throw new Error('Failed to assign member to the card. Please try again.');
    }
  };
  
  const fetchWorkspaceMembers = async (boardId: string): Promise<Record<string, string>> => {
    try {
      const response = await axios.get(`https://api.trello.com/1/boards/${boardId}/members`, {
        params: {
          key: TRELLO_API_KEY,
          token: TRELLO_API_TOKEN,
        },
      });
  
      const nameToIdMap: Record<string, string> = {};
      response.data.forEach((member: any) => {
        const fullName = member.fullName.toLowerCase();
        const [firstName, lastName] = fullName.split(' ');
  
        // Map full name, first name, and last name to the member ID
        nameToIdMap[fullName] = member.id;
        if (firstName) nameToIdMap[firstName] = member.id;
        if (lastName) nameToIdMap[lastName] = member.id;
      });
  
      return nameToIdMap;
    } catch (error) {
      console.error('Error fetching workspace members:', error.response?.data || error.message);
      throw new Error('Could not fetch workspace members. Please try again later.');
    }
  };
  
  const setDueDateOnCard = async (cardId: string, dueDate: string) => {
    try {
      const response = await axios.put(
        `https://api.trello.com/1/cards/${cardId}`,
        null,
        {
          params: {
            due: dueDate,
            key: TRELLO_API_KEY,
            token: TRELLO_API_TOKEN,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error setting due date on card:', error.response?.data || error.message);
      throw new Error('Failed to set due date on the card. Please try again.');
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

        {/* Assign Task Action */}
      <Action
        name="assignTaskToMember"
        description="Assigns a task (card) to a specific workspace member."
        schema={z.object({
          boardName: z.string(),
          listName: z.string(),
          cardName: z.string(),
          memberName: z.string(),
        })}
        examples={[
          { boardName: 'Agentika', listName: 'To-Do', cardName: 'General Testing', memberName: 'John' },
          { boardName: 'Agentika', listName: 'To-Do', cardName: 'General Testing', memberName: 'Doe' },
        ]}
        handler={async (e: PendingActionEvent) => {
          const { boardName, listName, cardName, memberName } = e.data.message.args as {
            boardName: string;
            listName: string;
            cardName: string;
            memberName: string;
          };

          try {
            // Step 1: Get the board ID
            const boardId = boardNameToIdMap[boardName.toLowerCase()];
            if (!boardId) {
              await e.data.agent.monologue(
                `I couldn't find a board named "${boardName}". Please check the name and try again.`
              );
              await e.commit();
              return;
            }

            // Step 2: Get the list ID
            const listNameToIdMap = await fetchListsInBoard(boardId);
            const listId = listNameToIdMap[listName.toLowerCase()];
            if (!listId) {
              await e.data.agent.monologue(
                `I couldn't find a list named "${listName}" in the "${boardName}" board.`
              );
              await e.commit();
              return;
            }

            // Step 3: Get the card ID
            const cardNameToIdMap = await fetchCardsInList(listId);
            const cardId = cardNameToIdMap[cardName.toLowerCase()];
            if (!cardId) {
              await e.data.agent.monologue(
                `I couldn't find a card named "${cardName}" in the "${listName}" list of the "${boardName}" board.`
              );
              await e.commit();
              return;
            }

            // Step 4: Match the member name
            const memberNameToIdMap = await fetchWorkspaceMembers(boardId);
            const matchingMemberIds = Object.entries(memberNameToIdMap)
              .filter(([name]) => name.includes(memberName.toLowerCase()))
              .map(([, id]) => id);

            if (matchingMemberIds.length === 0) {
              await e.data.agent.monologue(
                `I couldn't find a member matching "${memberName}" in the "${boardName}" workspace.`
              );
              await e.commit();
              return;
            } else if (matchingMemberIds.length > 1) {
              await e.data.agent.monologue(
                `I found multiple members matching "${memberName}". Could you please provide the full name?`
              );
              await e.commit();
              return;
            }

            const memberId = matchingMemberIds[0];

            // Step 5: Assign the member to the card
            await assignMemberToCard(cardId, memberId);
            await e.data.agent.monologue(
              `Successfully assigned "${memberName}" to the task "${cardName}" in the "${listName}" list of the "${boardName}" board.`
            );
          } catch (error) {
            console.error(error);
            await e.data.agent.monologue(
              'There was an error assigning the task. Please try again.'
            );
          }

          await e.commit();
        }}
      />

      <Action
        name="setCardDueDate"
        description="Sets a due date for a specific card in a Trello board."
        schema={z.object({
          boardName: z.string(),
          listName: z.string(),
          cardName: z.string(),
          dueDate: z.string(), // ISO8601 format date
        })}
        examples={[
          { boardName: 'Agentika', listName: 'To-Do', cardName: 'General Testing', dueDate: '2024-11-20T12:00:00.000Z' },
          { boardName: 'Project Management', listName: 'In Progress', cardName: 'Complete Design', dueDate: '2024-12-01T09:00:00.000Z' },
        ]}
        handler={async (e: PendingActionEvent) => {
          const { boardName, listName, cardName, dueDate } = e.data.message.args as {
            boardName: string;
            listName: string;
            cardName: string;
            dueDate: string;
          };

          try {
            // Step 1: Get the board ID
            const boardId = boardNameToIdMap[boardName.toLowerCase()];
            if (!boardId) {
              await e.data.agent.monologue(
                `I couldn't find a board named "${boardName}". Please check the name and try again.`
              );
              await e.commit();
              return;
            }

            // Step 2: Get the list ID
            const listNameToIdMap = await fetchListsInBoard(boardId);
            const listId = listNameToIdMap[listName.toLowerCase()];
            if (!listId) {
              await e.data.agent.monologue(
                `I couldn't find a list named "${listName}" in the "${boardName}" board.`
              );
              await e.commit();
              return;
            }

            // Step 3: Get the card ID
            const cardNameToIdMap = await fetchCardsInList(listId);
            const cardId = cardNameToIdMap[cardName.toLowerCase()];
            if (!cardId) {
              await e.data.agent.monologue(
                `I couldn't find a card named "${cardName}" in the "${listName}" list of the "${boardName}" board.`
              );
              await e.commit();
              return;
            }

            // Step 4: Set the due date
            try {
              const updatedCard = await setDueDateOnCard(cardId, dueDate);
              await e.data.agent.monologue(
                `Successfully set the due date for "${cardName}" to "${dueDate}".`
              );
            } catch (error) {
              await e.data.agent.monologue('There was an error setting the due date. Please try again.');
            }
          } catch (error) {
            console.error(error);
            await e.data.agent.monologue('There was an error processing your request. Please try again.');
          }

          await e.commit();
        }}
      />

    </>
  );
};

export default TrelloCardAssistant;
