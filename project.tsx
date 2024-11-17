import React from 'react';
import { Action, PendingActionEvent } from 'react-agents';
import { z } from 'zod';
import axios from 'axios';
import secrets from './secrets';

const TRELLO_API_KEY=secrets.TRELLO_API_KEY
const TRELLO_API_TOKEN=secrets.TRELLO_API_TOKEN


/**
 * Creates a card in a Trello list with an optional due date.
 *
 * @param listId - The ID of the Trello list where the card should be created.
 * @param cardName - The name of the card.
 * @param dueDate - (Optional) The due date for the card in ISO 8601 format (e.g., "2024-11-20T00:00:00.000Z").
 * @returns The created card's details.
 */
export const createCardInList = async (listId: string, cardName: string, dueDate?: string) => {
    try {
      const response = await axios.post(
        `https://api.trello.com/1/cards`,
        null,
        {
          params: {
            idList: listId,
            name: cardName,
            due: dueDate || null, // If no due date is provided, Trello accepts `null`
            key: TRELLO_API_KEY,
            token: TRELLO_API_TOKEN,
          },
        }
      );
  
      return response.data;
    } catch (error) {
      console.error('Error creating card in list:', error.response?.data || error.message);
      throw new Error('Failed to create the card. Please try again.');
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

// Helper function: Break project description into tasks
const extractTasksFromDescription = (description: string): string[] => {
  // Use NLP or simple splitting for task extraction
  return description
    .split('.')
    .map((task) => task.trim())
    .filter((task) => task.length > 0);
};

const TrelloProjectAssistant = () => {
  return (
    <Action
      name="createProjectBacklog"
      description="Takes a project description, divides it into tasks, creates a backlog list, and assigns tasks with an optional due date."
      schema={z.object({
        projectName: z.string(),
        description: z.string(),
        dueDate: z.string().optional(), // Optional due date
      })}
      examples={[
        {
          projectName: 'Website Redesign',
          description: 'Update the homepage. Add a new blog section. Test for mobile responsiveness.',
          dueDate: '2024-11-20',
        },
      ]}
      handler={async (e: PendingActionEvent) => {
        const { projectName, description, dueDate } = e.data.message.args as {
          projectName: string;
          description: string;
          dueDate?: string;
        };

        try {
          // Step 1: Fetch board-to-ID map
          const boardNameToIdMap = await fetchBoardNameToIdMap();
          const boardId = boardNameToIdMap[projectName.toLowerCase()];
          if (!boardId) {
            await e.data.agent.monologue(
              `I couldn't find a board named "${projectName}". Please create the board first or check the name.`
            );
            await e.commit();
            return;
          }

          // Step 2: Create a backlog list in the board
          const listName = `${projectName} Backlog`;
          const backlogList = await createListInBoard(boardId, listName);

          // Step 3: Extract tasks from the project description
          const tasks = extractTasksFromDescription(description);

          if (tasks.length === 0) {
            await e.data.agent.monologue(
              `I couldn't find any tasks in the provided description. Please provide a detailed description.`
            );
            await e.commit();
            return;
          }

          // Step 4: Add each task to the backlog list
          for (const task of tasks) {
            await createCardInList(backlogList.id, task, dueDate);
          }

          await e.data.agent.monologue(
            `I successfully created a backlog list named "${listName}" in the "${projectName}" board and added ${tasks.length} tasks!`
          );
        } catch (error) {
          console.error('Error creating project backlog:', error);
          await e.data.agent.monologue('There was an error creating the project backlog. Please try again.');
        }

        await e.commit();
      }}
    />
  );
};

export default TrelloProjectAssistant;
