const chromeObj = typeof window !== 'undefined' ? (window as any).chrome : undefined;
const isExtension = chromeObj && chromeObj.runtime && chromeObj.runtime.id;
const BASE_URL = isExtension ? 'https://api.holded.com/api' : '/api/holded';

export const HOLDED_CRM_API_URL = `${BASE_URL}/crm/v1`;
export const HOLDED_PROJECTS_API_URL = `${BASE_URL}/projects/v1`;
export const HOLDED_TEAM_API_URL = `${BASE_URL}/team/v1`;
export const HOLDED_INVOICING_API_URL = `${BASE_URL}/invoicing/v1`;

// --- HOLDED API V2 MAPPERS ---

function mapLeadToV1(lead: any): any {
  if (!lead) return lead;
  
  // Map status from Enum ('open', 'won', 'lost') to numeric (0, 1, 2)
  let statusNum = 0;
  if (lead.status === 'won') statusNum = 1;
  else if (lead.status === 'lost') statusNum = 2;
  else if (typeof lead.status === 'number') statusNum = lead.status;

  return {
    ...lead,
    funnelId: lead.funnel_id || lead.funnelId,
    stageId: lead.stage_id || lead.stageId,
    contactId: lead.contact_id || lead.contactId,
    contactName: lead.contact_name || lead.contactName,
    personId: lead.person_id || lead.personId,
    personName: lead.person_name || lead.personName,
    userId: lead.user_id || lead.userId,
    dueDate: lead.due_date || lead.dueDate,
    createdAt: lead.created_at || lead.createdAt,
    updatedAt: lead.updated_at || lead.updatedAt,
    customFields: lead.custom_fields || lead.customFields,
    status: statusNum
  };
}

function mapLeadToV2Payload(lead: any): any {
  if (!lead) return lead;
  const payload: any = { ...lead };
  
  if (lead.contactId) {
    payload.contact_id = lead.contactId;
    delete payload.contactId;
  }
  if (lead.funnelId) {
    payload.funnel_id = lead.funnelId;
    delete payload.funnelId;
  }
  if (lead.stageId) {
    payload.stage_id = lead.stageId;
    delete payload.stageId;
  }
  if (lead.dueDate) {
    payload.due_date = lead.dueDate;
    delete payload.dueDate;
  }
  if (lead.customFields) {
    payload.custom_fields = lead.customFields;
    delete payload.customFields;
  }
  
  // Map status from number to Enum string if present
  if (typeof lead.status === 'number') {
    if (lead.status === 1) payload.status = 'won';
    else if (lead.status === 2 || lead.status === -1) payload.status = 'lost';
    else payload.status = 'open';
  }
  
  return payload;
}

function mapContactToV1(contact: any): any {
  if (!contact) return contact;
  return {
    ...contact,
    customId: contact.custom_id || contact.customId,
    vatNumber: contact.vat_number || contact.vatNumber,
    tradeName: contact.trade_name || contact.tradeName,
    isPerson: contact.is_person !== undefined ? contact.is_person : contact.isPerson,
    billAddress: contact.bill_address || contact.billAddress,
    createdAt: contact.created_at || contact.createdAt,
    updatedAt: contact.updated_at || contact.updatedAt
  };
}

function mapContactToV2Payload(contact: any): any {
  if (!contact) return contact;
  const payload = { ...contact };
  if (contact.customId) {
    payload.custom_id = contact.customId;
    delete payload.customId;
  }
  if (contact.vatNumber) {
    payload.vat_number = contact.vatNumber;
    delete payload.vatNumber;
  }
  if (contact.tradeName) {
    payload.trade_name = contact.tradeName;
    delete payload.tradeName;
  }
  if (contact.isPerson !== undefined) {
    payload.is_person = contact.isPerson;
    delete payload.isPerson;
  }
  if (contact.isperson !== undefined) {
    payload.is_person = contact.isperson;
    delete payload.isperson;
  }
  if (contact.billAddress) {
    payload.bill_address = contact.billAddress;
    delete payload.billAddress;
  }
  return payload;
}

function mapProjectToV1(project: any): any {
  if (!project) return project;
  return {
    ...project,
    contactId: project.contact_id || project.contactId,
    startDate: project.start_date || project.startDate,
    dueDate: project.due_date || project.dueDate,
    numberOfTasks: project.number_of_tasks || project.numberOfTasks,
    completedTasks: project.completed_tasks || project.completedTasks,
    allowNotifications: project.allow_notifications || project.allowNotifications
  };
}

function mapProjectToV2Payload(project: any): any {
  if (!project) return project;
  return {
    name: project.name,
    description: project.description || '',
    due_date: project.dueDate || project.due_date || null,
    contact_id: project.contactId || project.contact_id || null
  };
}

function mapTaskToV1(task: any): any {
  if (!task) return task;
  return {
    ...task,
    projectId: task.project_id || task.projectId,
    listId: task.list_id || task.listId,
    dueDate: task.due_date || task.dueDate,
    assignedTo: task.assigned_to || task.assignedTo,
    storyPoints: task.story_points || task.storyPoints,
    startDate: task.start_date || task.startDate,
    updatedAt: task.updated_at || task.updatedAt,
    createdAt: task.created_at || task.createdAt
  };
}

function mapTaskToV2Payload(task: any): any {
  if (!task) return task;
  return {
    project_id: task.projectId || task.project_id,
    name: task.name,
    description: task.description || '',
    due_date: task.dueDate || task.due_date || null,
    priority: task.priority !== undefined ? Number(task.priority) : 0,
    status: task.status || 'todo',
    assigned_to: Array.isArray(task.assignedTo || task.assigned_to) ? (task.assignedTo || task.assigned_to) : []
  };
}

function mapTimeTrackingToV2Payload(data: any): any {
  if (!data) return data;
  return {
    duration: data.duration,
    user_id: data.userId || data.user_id,
    description: data.desc || data.description,
    task_id: data.taskId || data.task_id,
    cost_per_hour: data.costHour !== undefined ? String(data.costHour) : (data.cost_per_hour || "0"),
    date: data.date || new Date().toISOString().split('T')[0],
    category: data.category
  };
}

const mapFunnelStage = (stage: any) => ({
  ...stage,
  stageId: stage.id || stage.stageId,
  id: stage.id || stage.stageId
});

const mapFunnel = (funnel: any) => ({
  ...funnel,
  stages: Array.isArray(funnel.stages) ? funnel.stages.map(mapFunnelStage) : []
});

// --- CORE FETCH FUNCTION ---

export async function fetchHolded(url: string, apiKey: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers);
  // Set both v1 and v2 auth headers to ensure maximum compatibility with the API and proxy
  headers.set('key', apiKey);
  headers.set('Authorization', `Bearer ${apiKey}`);
  headers.set('Accept', 'application/json');
  if (options.method && options.method !== 'GET' && !headers.has('Content-Type')) {
     headers.set('Content-Type', 'application/json');
  }

  // Route fetch via background in Chrome Extension context to avoid CORS
  const chrome = (window as any).chrome;
  if (isExtension && chrome && chrome.runtime && chrome.runtime.sendMessage) {
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

// --- SERVICES ---

export const teamService = {
  getEmployees: async (apiKey: string) => {
    const res = await fetchHolded(`${BASE_URL}/v2/employees`, apiKey);
    const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
    return items.map((emp: any) => ({
      ...emp,
      holdedUserId: emp.holded_user_id || emp.holdedUserId || emp.id,
      firstName: emp.name || emp.firstName,
      lastName: emp.last_name || emp.lastName,
      fullName: emp.full_name || emp.fullName || `${emp.name || ''} ${emp.last_name || ''}`.trim(),
      email: emp.email,
      mainEmail: emp.email || emp.mainEmail
    }));
  }
};

export const contactsService = {
  getContacts: async (apiKey: string) => {
    const res = await fetchHolded(`${BASE_URL}/v2/contacts`, apiKey);
    const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
    return items.map(mapContactToV1);
  },
  createContact: async (apiKey: string, contact: any) => {
    return fetchHolded(`${BASE_URL}/v2/contacts`, apiKey, {
      method: 'POST',
      body: JSON.stringify(mapContactToV2Payload(contact))
    });
  }
};

export const crmService = {
  getFunnels: async (apiKey: string) => {
    const res = await fetchHolded(`${BASE_URL}/v2/funnels`, apiKey);
    const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
    return items.map(mapFunnel);
  },
  getLeads: async (apiKey: string) => {
    const res = await fetchHolded(`${BASE_URL}/v2/leads`, apiKey);
    const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
    return items.map(mapLeadToV1);
  },
  createLead: async (apiKey: string, lead: any) => {
    return fetchHolded(`${BASE_URL}/v2/leads`, apiKey, {
      method: 'POST',
      body: JSON.stringify(mapLeadToV2Payload(lead))
    });
  },
  updateLead: async (apiKey: string, leadId: string, lead: any) => {
    return fetchHolded(`${BASE_URL}/v2/leads/${leadId}`, apiKey, {
      method: 'PUT',
      body: JSON.stringify(mapLeadToV2Payload(lead))
    });
  },
  updateLeadStage: async (apiKey: string, leadId: string, stageId: string) => {
    return fetchHolded(`${BASE_URL}/v2/leads/${leadId}/stage`, apiKey, {
      method: 'PUT',
      body: JSON.stringify({ stage_id: stageId })
    });
  },
  deleteLead: async (apiKey: string, leadId: string) => {
    return fetchHolded(`${BASE_URL}/v2/leads/${leadId}`, apiKey, {
      method: 'DELETE'
    });
  },
  getActivities: async (apiKey: string, leadId: string) => {
    try {
      const lead = await fetchHolded(`${BASE_URL}/v2/leads/${leadId}`, apiKey);
      if (!lead) return [];
      
      const events = Array.isArray(lead.events) ? lead.events : [];
      const tasks = Array.isArray(lead.tasks) ? lead.tasks : [];
      
      const mappedEvents = events.map((e: any) => ({
        id: e.id,
        name: e.name || e.title || 'Evento de Oportunidad',
        desc: e.description || e.desc,
        kind: e.kind || e.type || 'evento',
        startDate: e.startDate || e.date || (e.created_at ? Math.floor(new Date(e.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000)),
        status: e.status || 0
      }));
      
      const mappedTasks = tasks.map((t: any) => ({
        id: t.id,
        name: t.name || t.title || 'Tarea de Oportunidad',
        desc: t.description || t.desc,
        kind: 'tarea',
        startDate: t.startDate || t.due_date || (t.created_at ? Math.floor(new Date(t.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000)),
        status: t.status === 'completed' || t.completed ? 1 : 0
      }));
      
      return [...mappedEvents, ...mappedTasks].sort((a, b) => b.startDate - a.startDate);
    } catch (e) {
      console.error("Error getting activities from v2", e);
      return [];
    }
  },
  createActivity: async (apiKey: string, activity: any) => {
    const leadId = activity.leadId;
    if (!leadId) throw new Error("leadId is required to create an activity");
    
    if (activity.kind === 'tarea') {
      return fetchHolded(`${BASE_URL}/v2/leads/${leadId}/tasks`, apiKey, {
        method: 'POST',
        body: JSON.stringify({
          name: activity.name || 'Nueva tarea'
        })
      });
    } else {
      return fetchHolded(`${BASE_URL}/v2/leads/${leadId}/notes`, apiKey, {
        method: 'POST',
        body: JSON.stringify({
          title: activity.name || 'Nota de actividad',
          description: activity.desc || ''
        })
      });
    }
  }
};

export const projectsService = {
  getProjects: async (apiKey: string) => {
    const res = await fetchHolded(`${BASE_URL}/v2/projects`, apiKey);
    const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
    return items.map(mapProjectToV1);
  },
  createProject: async (apiKey: string, project: any) => {
    return fetchHolded(`${BASE_URL}/v2/projects`, apiKey, {
      method: 'POST',
      body: JSON.stringify(mapProjectToV2Payload(project))
    });
  },
  getProjectStatuses: async (apiKey: string, projectId: string) => {
    try {
      const proj = await fetchHolded(`${BASE_URL}/v2/projects/${projectId}`, apiKey);
      if (proj && Array.isArray(proj.lists)) {
        return proj.lists.map((list: any) => ({
          id: list.id || list.key,
          statusId: list.id || list.key,
          name: list.name,
          type: list.completed ? 2 : 1
        }));
      }
    } catch (e) {
      console.warn("Could not load project statuses from v2 project detail", e);
    }
    
    // Fallback to v1 statuses if it fails
    try {
      return await fetchHolded(`${BASE_URL}/projects/v1/projects/${projectId}/statuses`, apiKey);
    } catch (e) {
      return [
        { id: "0", name: "Por hacer", type: 0 },
        { id: "1", name: "En progreso", type: 1 },
        { id: "2", name: "Completado", type: 2 }
      ];
    }
  },
  getTasks: async (apiKey: string) => {
    const res = await fetchHolded(`${BASE_URL}/v2/tasks`, apiKey);
    const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
    return items.map(mapTaskToV1);
  },
  createTask: async (apiKey: string, task: any) => {
    return fetchHolded(`${BASE_URL}/v2/tasks`, apiKey, {
      method: 'POST',
      body: JSON.stringify(mapTaskToV2Payload(task))
    });
  },
  addTimeTracking: async (apiKey: string, projectId: string, data: any) => {
    if (!projectId) throw new Error("projectId is required for addTimeTracking");
    return fetchHolded(`${BASE_URL}/v2/projects/${projectId}/times`, apiKey, {
      method: "POST",
      body: JSON.stringify(mapTimeTrackingToV2Payload(data))
    });
  },
  getProjectTimes: async (apiKey: string, projectId: string) => {
    if (!projectId) throw new Error("projectId is required for getProjectTimes");
    const res = await fetchHolded(`${BASE_URL}/v2/projects/${projectId}/times`, apiKey);
    return res && res.items ? res.items : (Array.isArray(res) ? res : []);
  },
  updateTimeTracking: async (apiKey: string, projectId: string, timeTrackingId: string, data: any) => {
    if (!projectId || !timeTrackingId) throw new Error("projectId and timeTrackingId are required");
    return fetchHolded(`${BASE_URL}/v2/projects/${projectId}/times/${timeTrackingId}`, apiKey, {
      method: "PUT",
      body: JSON.stringify(mapTimeTrackingToV2Payload(data))
    });
  },
  getAllTimes: async (apiKey: string, start?: number, end?: number) => {
    let url = `${BASE_URL}/v2/project-times?limit=100`;
    const res = await fetchHolded(url, apiKey);
    const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
    
    // Format the items to match the nested array shape expected by the frontend
    return [
      {
        timeTracking: items.map((t: any) => ({
          id: t.id,
          duration: t.duration,
          taskId: t.task_id || t.taskId,
          userId: t.user_id || t.userId,
          userName: t.user_name || t.userName,
          description: t.description || t.desc,
          date: t.date,
          costPerHour: t.cost_per_hour || t.costPerHour
        }))
      }
    ];
  }
};
