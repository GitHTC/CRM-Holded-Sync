const chromeObj = typeof window !== 'undefined' ? (window as any).chrome : undefined;
const isExtension = chromeObj && chromeObj.runtime && chromeObj.runtime.id;
const BASE_URL = isExtension ? 'https://api.holded.com/api' : '/api/holded';

export const HOLDED_CRM_API_URL = `${BASE_URL}/crm/v1`;
export const HOLDED_PROJECTS_API_URL = `${BASE_URL}/projects/v1`;
export const HOLDED_TEAM_API_URL = `${BASE_URL}/team/v1`;
export const HOLDED_INVOICING_API_URL = `${BASE_URL}/invoicing/v1`;

export async function fetchHolded(url: string, apiKey: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers);
  headers.set('key', apiKey);
  headers.set('Accept', 'application/json');
  if (options.method && options.method !== 'GET' && !headers.has('Content-Type')) {
     headers.set('Content-Type', 'application/json');
  }

  // If in Chrome Extension context and running background script is available, route fetch via background to avoid CORS
  const chrome = (window as any).chrome;
  if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
    const headersObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'fetchHolded',
        url,
        options: {
          method: options.method || 'GET',
          headers: headersObj,
          body: options.body
        }
      }, (response: any) => {
        const lastErr = chrome.runtime.lastError;
        if (lastErr) {
          reject(new Error(`Extension connection error: ${lastErr.message}`));
          return;
        }
        if (!response) {
          reject(new Error('No response from background proxy'));
          return;
        }

        if (!response.ok) {
          if (response.status === 404) {
            resolve([]); // Return empty array on 404 for compatibility
            return;
          }
          let errMsg = response.text;
          try {
            const errJson = JSON.parse(response.text);
            if (errJson.info) errMsg = errJson.info;
            else if (errJson.message) errMsg = errJson.message;
          } catch(e) {}
          reject(new Error(`Holded API Error ${response.status}: ${errMsg || response.statusText}`));
          return;
        }

        if (!response.text) {
          resolve({});
          return;
        }

        try {
          resolve(JSON.parse(response.text));
        } catch (e) {
          if (response.text.trim().startsWith('<')) {
            console.error('HTML Response error:', response.text.substring(0, 500));
            reject(new Error(`The server returned an HTML error page. First chars: ${response.text.substring(0, 50)}`));
            return;
          }
          reject(new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`));
        }
      });
    });
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) return []; // Some Holded endpoints return 404 when empty
    const errText = await response.text();
    let errMsg = errText;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.info) errMsg = errJson.info;
      else if (errJson.message) errMsg = errJson.message;
    } catch(e) {}
    throw new Error(`Holded API Error ${response.status}: ${errMsg || response.statusText}`);
  }

  // Holded might return empty responses on success sometimes
  const text = await response.text();
  if (!text) return {};
  
  try {
    return JSON.parse(text);
  } catch (e) {
    if (text.trim().startsWith('<')) {
      console.error('HTML Response error:', text.substring(0, 500));
      throw new Error(`The server returned an HTML error page instead of JSON. First chars: ${text.substring(0, 50)}`);
    }
    throw new Error(`Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}. Response was: ${text.substring(0, 100)}`);
  }
}

export const teamService = {
  getEmployees: async (apiKey: string) => {
    return fetchHolded(`${HOLDED_TEAM_API_URL}/employees`, apiKey);
  }
};

export const contactsService = {
  getContacts: async (apiKey: string) => {
    return fetchHolded(`${HOLDED_INVOICING_API_URL}/contacts`, apiKey);
  },
  createContact: async (apiKey: string, contact: any) => {
    return fetchHolded(`${HOLDED_INVOICING_API_URL}/contacts`, apiKey, {
      method: 'POST',
      body: JSON.stringify(contact)
    });
  }
};

export const crmService = {
  getFunnels: async (apiKey: string) => {
    return fetchHolded(`${HOLDED_CRM_API_URL}/funnels`, apiKey);
  },
  getLeads: async (apiKey: string) => {
    return fetchHolded(`${HOLDED_CRM_API_URL}/leads`, apiKey);
  },
  createLead: async (apiKey: string, lead: any) => {
    return fetchHolded(`${HOLDED_CRM_API_URL}/leads`, apiKey, {
      method: 'POST',
      body: JSON.stringify(lead)
    });
  },
  updateLead: async (apiKey: string, leadId: string, lead: any) => {
    return fetchHolded(`${HOLDED_CRM_API_URL}/leads/${leadId}`, apiKey, {
      method: 'PUT',
      body: JSON.stringify(lead)
    });
  },
  updateLeadStage: async (apiKey: string, leadId: string, stageId: string) => {
    return fetchHolded(`${HOLDED_CRM_API_URL}/leads/${leadId}/stages`, apiKey, {
      method: 'PUT',
      body: JSON.stringify({ stageId })
    });
  },
  deleteLead: async (apiKey: string, leadId: string) => {
    return fetchHolded(`${HOLDED_CRM_API_URL}/leads/${leadId}`, apiKey, {
      method: 'DELETE'
    });
  },
  getActivities: async (apiKey: string, leadId: string) => {
    const res = await fetchHolded(`${HOLDED_CRM_API_URL}/events`, apiKey);
    if (Array.isArray(res)) {
      return res.filter((e: any) => e.leadId === leadId || e.contactId === leadId);
    }
    return res;
  },
  createActivity: async (apiKey: string, activity: any) => {
    return fetchHolded(`${HOLDED_CRM_API_URL}/events`, apiKey, {
      method: 'POST',
      body: JSON.stringify(activity)
    });
  }
};

export const projectsService = {
  getProjects: async (apiKey: string) => {
    return fetchHolded(`${HOLDED_PROJECTS_API_URL}/projects`, apiKey);
  },
  getProjectStatuses: async (apiKey: string, projectId: string) => {
    return fetchHolded(`${HOLDED_PROJECTS_API_URL}/projects/${projectId}/statuses`, apiKey);
  },
  getTasks: async (apiKey: string) => {
    return fetchHolded(`${HOLDED_PROJECTS_API_URL}/tasks`, apiKey);
  },
  addTimeTracking: async (apiKey: string, projectId: string, data: any) => {
    if (!projectId) throw new Error("projectId is required for addTimeTracking");
    return fetchHolded(`${HOLDED_PROJECTS_API_URL}/projects/${projectId}/times`, apiKey, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  getProjectTimes: async (apiKey: string, projectId: string) => {
    if (!projectId) throw new Error("projectId is required for getProjectTimes");
    return fetchHolded(`${HOLDED_PROJECTS_API_URL}/projects/${projectId}/times`, apiKey);
  },
  updateTimeTracking: async (apiKey: string, projectId: string, timeTrackingId: string, data: any) => {
    if (!projectId || !timeTrackingId) throw new Error("projectId and timeTrackingId are required");
    return fetchHolded(`${HOLDED_PROJECTS_API_URL}/projects/${projectId}/times/${timeTrackingId}`, apiKey, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },
  getAllTimes: async (apiKey: string, start?: number, end?: number) => {
    let url = `${HOLDED_PROJECTS_API_URL}/projects/times`;
    if (start && end) url += `?start=${start}&end=${end}`;
    return fetchHolded(url, apiKey);
  }
};
