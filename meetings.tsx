import React from 'react';
import { Action, Agent, PendingActionEvent } from 'react-agents';
import { z } from 'zod';
import secrets from './secrets';

interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

const GOOGLE_CALENDAR_ID = secrets.GOOGLE_CALENDAR_ID
const GOOGLE_API_KEY = secrets.GOOGLE_API_KEY
const GOOGLE_SERVICE_ACCOUNT_EMAIL = secrets.GOOGLE_SERVICE_ACCOUNT_EMAIL
const GOOGLE_PRIVATE_KEY = secrets.GOOGLE_PRIVATE_KEY

class GoogleCalendarManager {
    private readonly GOOGLE_CALENDAR_ID: string;
    private readonly GOOGLE_API_KEY: string;
    private readonly GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
    private readonly GOOGLE_PRIVATE_KEY: string;
    constructor({
      GOOGLE_CALENDAR_ID,
      GOOGLE_API_KEY,
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY
    }: {
      GOOGLE_CALENDAR_ID: string,
      GOOGLE_API_KEY: string,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: string,
      GOOGLE_PRIVATE_KEY: string
    }) {
      this.GOOGLE_CALENDAR_ID = GOOGLE_CALENDAR_ID;
      this.GOOGLE_API_KEY = GOOGLE_API_KEY;
      this.GOOGLE_SERVICE_ACCOUNT_EMAIL = GOOGLE_SERVICE_ACCOUNT_EMAIL;
      this.GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY;
    }

  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1-hour token validity

    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const claimSet = JSON.stringify({
      iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expiry,
      iat: now,
    });

    const toSign = `${btoa(header)}.${btoa(claimSet)}`;
    const signature = await this.signJwt(toSign);
    const jwt = `${toSign}.${signature}`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Error obtaining access token: ${data.error}`);
    }
    return data.access_token;
  }

  private async signJwt(input: string): Promise<string> {
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(input);
    return sign.sign(GOOGLE_PRIVATE_KEY, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  async setCalendarEvent(event: CalendarEvent): Promise<string> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${this.GOOGLE_CALENDAR_ID}/events?key=${this.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create event: ${errorText}`);
    }

    const result = await response.json();
    return result.htmlLink;
  }
}

const PersonalAssistant = () => {

  const googleCalendarManager = new GoogleCalendarManager({
    GOOGLE_CALENDAR_ID: GOOGLE_CALENDAR_ID,
    GOOGLE_API_KEY: GOOGLE_API_KEY,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: GOOGLE_PRIVATE_KEY,
  });

  return (
    <Action
      name="setCalendarEvent"
      description="Schedule a new meeting in Google Calendar."
      schema={z.object({
        summary: z.string(),
        startDateTime: z.string(),
        endDateTime: z.string(),
        description: z.string().optional(),
      })}
      examples={[
        {
          summary: 'Team Sync',
          startDateTime: '2024-11-20T10:00:00Z',
          endDateTime: '2024-11-20T11:00:00Z',
          description: 'Discuss project updates.',
        },
      ]}
      handler={async (e: PendingActionEvent) => {
        const { summary, description, startDateTime, endDateTime } = e.data.message.args;
        try {
          const eventLink = await googleCalendarManager.setCalendarEvent({
            summary,
            description,
            start: { dateTime: startDateTime },
            end: { dateTime: endDateTime },
          });
          await e.data.agent.monologue(`Meeting scheduled successfully! Here is the link: ${eventLink}`);
        } catch (error) {
          await e.data.agent.monologue(`Failed to schedule the meeting. Error: ${error.message}`);
        }
        await e.commit();
      }}
    />
  );
};

export default PersonalAssistant;
  
