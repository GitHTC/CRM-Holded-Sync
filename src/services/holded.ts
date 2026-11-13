const chromeObj = typeof window !== 'undefined' ? (window as any).chrome : undefined;
const isExtension = chromeObj && chromeObj.runtime && chromeObj.runtime.id;
const BASE_URL = isExtension ? 'https://api.holded.com/api' : '/api/holded';

export const HOLDED_CRM_API_URL = `${BASE_URL}/v2`;
export const HOLDED_PROJECTS_API_URL = `${BASE_URL}/v2`;
export const HOLDED_TEAM_API_URL = `${BASE_URL}/v2`;
export const HOLDED_INVOICING_API_URL = `${BASE_URL}/v2`;

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
  const payload: any = {
    name: contact.name?.trim()
  };
  
  if (contact.code && contact.code.trim()) payload.code = contact.code.trim();
  if ((contact.vat_number || contact.vatNumber) && (contact.vat_number || contact.vatNumber).trim()) {
    payload.vat_number = (contact.vat_number || contact.vatNumber).trim();
  }
  if ((contact.trade_name || contact.tradeName) && (contact.trade_name || contact.tradeName).trim()) {
    payload.trade_name = (contact.trade_name || contact.tradeName).trim();
  }
  if (contact.is_person !== undefined) {
    payload.is_person = Boolean(contact.is_person);
  } else if (contact.isperson !== undefined) {
    payload.is_person = Boolean(contact.isperson);
  } else if (contact.isPerson !== undefined) {
    payload.is_person = Boolean(contact.isPerson);
  }
  
  if (contact.email && contact.email.trim()) payload.email = contact.email.trim();
  if (contact.phone && contact.phone.trim()) payload.phone = contact.phone.trim();
  if (contact.mobile && contact.mobile.trim()) payload.mobile = contact.mobile.trim();
  if (contact.website && contact.website.trim()) payload.website = contact.website.trim();
  if (contact.type) payload.type = contact.type;

  const addr = contact.bill_address || contact.billAddress;
  if (addr && (addr.address || addr.city || addr.postal_code || addr.postalCode || addr.province || addr.country)) {
    payload.bill_address = {
      address: addr.address || null,
      city: addr.city || null,
      postal_code: addr.postal_code || addr.postalCode || null,
      province: addr.province || null,
      country: addr.country || null,
      country_code: addr.country_code || addr.countryCode || null,
      info: addr.info || null
    };
  }

  return payload;
}

function mapProjectToV1(project: any): any {
  if (!project) return project;
  return {
    ...project,
    contactId: project.contact_id || project.contactId,
    contactName: project.contact_name || project.contactName,
    startDate: project.start_date || project.startDate,
    dueDate: project.due_date || project.dueDate,
    numberOfTasks: project.number_of_tasks !== undefined ? project.number_of_tasks : project.numberOfTasks,
    completedTasks: project.completed_tasks !== undefined ? project.completed_tasks : project.completedTasks,
    allowNotifications: project.allow_notifications || project.allowNotifications,
    users: project.users || {},
    tags: Array.isArray(project.tags) ? project.tags : [],
    billable: Boolean(project.billable),
    archived: Boolean(project.archived),
    status: project.status !== undefined ? project.status : 0
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

function mapProjectUpdateToV2Payload(project: any): any {
  if (!project) return project;
  const payload: any = {
    name: project.name
  };
  if (project.description !== undefined) payload.description = project.description;
  if (project.dueDate !== undefined || project.due_date !== undefined) {
    payload.due_date = project.dueDate || project.due_date || null;
  }
  if (project.startDate !== undefined || project.start_date !== undefined) {
    payload.start_date = project.startDate || project.start_date || null;
  }
  if (project.contactId !== undefined || project.contact_id !== undefined) {
    payload.contact_id = project.contactId || project.contact_id || null;
  }
  if (project.status !== undefined) payload.status = Number(project.status);
  if (project.billable !== undefined) payload.billable = Boolean(project.billable);
  if (Array.isArray(project.tags)) payload.tags = project.tags;
  if (project.allowNotifications !== undefined) payload.allow_notifications = project.allowNotifications;
  if (Array.isArray(project.lists)) payload.lists = project.lists;
  return payload;
}

function mapTaskToV1(task: any): any {
  if (!task) return task;
  return {
    ...task,
    projectId: task.project_id || task.projectId,
    listId: task.list_id || task.listId,
    dueDate: task.due_date || task.dueDate,
    startDate: task.start_date || task.startDate,
    assignedTo: Array.isArray(task.assigned_to) ? task.assigned_to : (task.assignedTo || []),
    storyPoints: task.story_points !== undefined ? task.story_points : task.storyPoints,
    updatedAt: task.updated_at || task.updatedAt,
    createdAt: task.created_at || task.createdAt,
    priority: task.priority !== undefined ? Number(task.priority) : 0,
    status: task.status || 'todo',
    comments: Array.isArray(task.comments) ? task.comments : []
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

function mapTaskUpdateToV2Payload(task: any): any {
  if (!task) return task;
  const payload: any = {};
  if (task.name !== undefined) payload.name = task.name;
  if (task.description !== undefined) payload.description = task.description;
  if (task.due_date !== undefined || task.dueDate !== undefined) {
    payload.due_date = task.dueDate !== undefined ? task.dueDate : task.due_date;
  }
  if (task.priority !== undefined) {
    payload.priority = Number(task.priority);
  }
  if (task.status !== undefined) {
    payload.status = task.status;
  }
  if (task.assignedTo !== undefined || task.assigned_to !== undefined) {
    payload.assigned_to = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assigned_to || []);
  }
  // NOTE: Do NOT include project_id when updating; Holded v2 ignores priority and other task edits if project_id is sent
  return payload;
}

function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mapTimeTrackingToV2Payload(data: any): any {
  if (!data) return data;
  return {
    duration: data.duration,
    user_id: data.userId || data.user_id,
    description: data.desc || data.description,
    task_id: data.taskId || data.task_id,
    cost_per_hour: data.costHour !== undefined ? String(data.costHour) : (data.cost_per_hour || "0"),
    date: data.date || getLocalTodayIso(),
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
          let errMsg = response.text || '';
          try {
            const errJson = JSON.parse(response.text);
            if (errJson.detail) errMsg = errJson.detail;
            else if (errJson.info) errMsg = errJson.info;
            else if (errJson.message) errMsg = errJson.message;
            else if (errJson.title) errMsg = errJson.title;
          } catch(e) {}
          if (typeof errMsg === 'string' && (errMsg.includes('<html') || errMsg.includes('<!DOCTYPE'))) {
            errMsg = response.status === 403 
              ? 'Acceso denegado (403 Forbidden). El Token API no tiene permisos o es inválido.'
              : `Error HTTP ${response.status}`;
          }
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
    let errMsg = errText || '';
    try {
      const errJson = JSON.parse(errText);
      if (errJson.detail) errMsg = errJson.detail;
      else if (errJson.info) errMsg = errJson.info;
      else if (errJson.message) errMsg = errJson.message;
      else if (errJson.title) errMsg = errJson.title;
    } catch(e) {}
    if (typeof errMsg === 'string' && (errMsg.includes('<html') || errMsg.includes('<!DOCTYPE'))) {
      errMsg = response.status === 403 
        ? 'Acceso denegado (403 Forbidden). El Token API no tiene permisos o es inválido.'
        : `Error HTTP ${response.status}`;
    }
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

let cachedEmployees: any[] | null = null;
let cachedEmployeesTimestamp = 0;

export const teamService = {
  getEmployees: async (apiKey: string, forceRefresh = false) => {
    if (!forceRefresh && cachedEmployees && Date.now() - cachedEmployeesTimestamp < 300000) {
      return cachedEmployees;
    }

    let allItems: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 4;

    while (hasMore && pageCount < maxPages) {
      let url = `${BASE_URL}/v2/employees?limit=100`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      allItems.push(...items);

      if (items.length < 100 || !res?.has_more || !res?.cursor || res.cursor === cursor) {
        hasMore = false;
      } else {
        cursor = res.cursor;
        pageCount++;
      }
    }

    const mapped = allItems.map((emp: any) => ({
      ...emp,
      employeeId: emp.id,
      rawHoldedUserId: emp.holded_user_id || emp.holdedUserId || null,
      holdedUserId: emp.holded_user_id || emp.holdedUserId || emp.id,
      firstName: emp.name || emp.firstName,
      lastName: emp.last_name || emp.lastName,
      fullName: emp.full_name || emp.fullName || `${emp.name || ''} ${emp.last_name || ''}`.trim(),
      email: emp.email,
      mainEmail: emp.email || emp.mainEmail
    }));

    cachedEmployees = mapped;
    cachedEmployeesTimestamp = Date.now();
    return mapped;
  }
};

export const contactsService = {
  getContacts: async (apiKey: string, params?: { 
    phone?: string; 
    mobile?: string; 
    email?: string; 
    code?: string; 
    custom_id?: string; 
    limit?: number; 
    cursor?: string;
    fetchAll?: boolean;
  }) => {
    // Default: fetch single page of 100 contacts unless fetchAll is explicitly true
    if (params?.fetchAll !== true) {
      let url = `${BASE_URL}/v2/contacts?limit=${params?.limit || 100}`;
      const searchParams = new URLSearchParams();
      if (params?.phone) searchParams.set('phone', params.phone);
      if (params?.mobile) searchParams.set('mobile', params.mobile);
      if (params?.email) searchParams.set('email', params.email);
      if (params?.code) searchParams.set('code', params.code);
      if (params?.custom_id) searchParams.set('custom_id', params.custom_id);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.cursor) searchParams.set('cursor', params.cursor);
      const queryStr = searchParams.toString();
      if (queryStr) url += `?${queryStr}`;

      const res = await fetchHolded(url, apiKey);
      const rawItems = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      const items = rawItems.map(mapContactToV1);
      (items as any).cursor = res?.cursor || null;
      (items as any).hasMore = Boolean(res?.has_more);
      return items;
    }

    // Explicit fetchAll: safety limited to 5 pages (500 contacts) with duplicate protection
    let allItems: any[] = [];
    const seenContactIds = new Set<string>();
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 5;

    while (hasMore && pageCount < maxPages) {
      let url = `${BASE_URL}/v2/contacts?limit=100`;
      if (params?.phone) url += `&phone=${encodeURIComponent(params.phone)}`;
      if (params?.mobile) url += `&mobile=${encodeURIComponent(params.mobile)}`;
      if (params?.email) url += `&email=${encodeURIComponent(params.email)}`;
      if (params?.code) url += `&code=${encodeURIComponent(params.code)}`;
      if (params?.custom_id) url += `&custom_id=${encodeURIComponent(params.custom_id)}`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      
      let newCount = 0;
      for (const item of items) {
        if (item.id && !seenContactIds.has(item.id)) {
          seenContactIds.add(item.id);
          allItems.push(item);
          newCount++;
        }
      }

      if (items.length < 100 || newCount === 0 || !res?.has_more || !res?.cursor || res.cursor === cursor) {
        hasMore = false;
        break;
      }

      cursor = res.cursor;
      pageCount++;
    }

    return allItems.map(mapContactToV1);
  },
  searchContacts: async (apiKey: string, query: { name: string; limit?: number; cursor?: string }) => {
    const searchTerm = (query.name || '').trim();
    if (!searchTerm) return [];

    const contactsMap = new Map<string, any>();

    // 1. Holded v2 endpoint for search by name / tradeName
    try {
      let url = `${BASE_URL}/v2/contacts/search?name=${encodeURIComponent(searchTerm)}`;
      if (query.limit) url += `&limit=${query.limit}`;
      if (query.cursor) url += `&cursor=${encodeURIComponent(query.cursor)}`;
      const res = await fetchHolded(url, apiKey);
      const rawItems = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      for (const item of rawItems) {
        const mapped = mapContactToV1(item);
        contactsMap.set(mapped.id, mapped);
      }
    } catch (e) {
      console.warn('Holded v2 /contacts/search by name notice:', e);
    }

    // 2. Also search by code (CIF / NIF / DNI) if term is at least 2 characters
    if (searchTerm.length >= 2) {
      try {
        const codeRes = await fetchHolded(`${BASE_URL}/v2/contacts?code=${encodeURIComponent(searchTerm)}`, apiKey);
        const codeItems = codeRes && codeRes.items ? codeRes.items : (Array.isArray(codeRes) ? codeRes : []);
        for (const item of codeItems) {
          const mapped = mapContactToV1(item);
          contactsMap.set(mapped.id, mapped);
        }
      } catch (e) {
        // ignore
      }
    }

    // 3. Also search by email if term contains @
    if (searchTerm.includes('@')) {
      try {
        const emailRes = await fetchHolded(`${BASE_URL}/v2/contacts?email=${encodeURIComponent(searchTerm)}`, apiKey);
        const emailItems = emailRes && emailRes.items ? emailRes.items : (Array.isArray(emailRes) ? emailRes : []);
        for (const item of emailItems) {
          const mapped = mapContactToV1(item);
          contactsMap.set(mapped.id, mapped);
        }
      } catch (e) {
        // ignore
      }
    }

    // 4. Also search by phone or mobile if numeric
    const cleanDigits = searchTerm.replace(/[\s\-\+]/g, '');
    if (cleanDigits.length >= 6 && /^\d+$/.test(cleanDigits)) {
      try {
        const [phoneRes, mobileRes] = await Promise.all([
          fetchHolded(`${BASE_URL}/v2/contacts?phone=${encodeURIComponent(searchTerm)}`, apiKey).catch(() => null),
          fetchHolded(`${BASE_URL}/v2/contacts?mobile=${encodeURIComponent(searchTerm)}`, apiKey).catch(() => null),
        ]);
        const phoneItems = phoneRes && phoneRes.items ? phoneRes.items : [];
        const mobileItems = mobileRes && mobileRes.items ? mobileRes.items : [];
        for (const item of [...phoneItems, ...mobileItems]) {
          const mapped = mapContactToV1(item);
          contactsMap.set(mapped.id, mapped);
        }
      } catch (e) {
        // ignore
      }
    }

    const items = Array.from(contactsMap.values());
    (items as any).cursor = null;
    (items as any).hasMore = false;
    return items;
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
    let allItems: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 20; // Upper limit safeguard (up to 2000 leads)

    while (hasMore && pageCount < maxPages) {
      let url = `${BASE_URL}/v2/leads?limit=100`;
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }
      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      allItems.push(...items);

      if (res && res.has_more && res.cursor) {
        cursor = res.cursor;
        pageCount++;
      } else {
        hasMore = false;
      }
    }

    return allItems.map(mapLeadToV1);
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
      // API v2 uses the /events endpoint for CRM activities, which can be linked to a lead_id
      const res = await fetchHolded(`${BASE_URL}/v2/events?limit=100`, apiKey);
      const allEvents = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      
      // Filter by leadId since /events might return all events if query param is ignored
      const leadEvents = allEvents.filter((e: any) => e.lead_id === leadId || e.leadId === leadId);
      
      const getUnixSec = (val: any) => {
        if (!val) return Math.floor(Date.now() / 1000);
        const d = new Date(val);
        return !isNaN(d.getTime()) ? Math.floor(d.getTime() / 1000) : Math.floor(Date.now() / 1000);
      };

      const mappedEvents = leadEvents.map((e: any) => ({
        id: e.id,
        name: e.name || 'Actividad',
        desc: e.description || e.desc,
        kind: e.kind || 'evento',
        startDate: getUnixSec(e.start_date || e.date || e.created_at),
        status: e.status || 0
      }));
      
      return mappedEvents.sort((a: any, b: any) => b.startDate - a.startDate);
    } catch (e) {
      console.error("Error getting activities from v2", e);
      return [];
    }
  },
  createActivity: async (apiKey: string, activity: any) => {
    const leadId = activity.leadId;
    if (!leadId) throw new Error("leadId is required to create an activity");
    
    const kindMap: Record<string, string> = {
      llamada: 'call',
      reunion: 'meeting',
      email: 'email',
      vuelo: 'flight',
      comida: 'lunch',
      tarea: 'task',
      nota: 'note'
    };
    
    const holdedKind = kindMap[activity.kind] || 'meeting';
    
    const startIso = activity.startDate 
      ? new Date(activity.startDate * 1000).toISOString()
      : new Date().toISOString();
      
    const endIso = activity.duration && activity.startDate
      ? new Date((activity.startDate + activity.duration) * 1000).toISOString()
      : new Date(Date.now() + 3600000).toISOString();

    return fetchHolded(`${BASE_URL}/v2/events`, apiKey, {
      method: 'POST',
      body: JSON.stringify({
        name: activity.name || 'Actividad',
        description: activity.desc || '',
        kind: holdedKind,
        start_date: startIso,
        end_date: endIso,
        lead_id: leadId,
        status: activity.status || 0
      })
    });
  }
};

export const projectsService = {
  getProjects: async (apiKey: string, status?: string, cursor?: string, limit: number = 100) => {
    if (cursor) {
      let url = `${BASE_URL}/v2/projects?limit=${limit}`;
      if (status && status !== 'all') {
        url += `&status=${encodeURIComponent(status)}`;
      }
      url += `&cursor=${encodeURIComponent(cursor)}`;
      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      return items.map(mapProjectToV1);
    }

    let allItems: any[] = [];
    const seenIds = new Set<string>();
    let nextCursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 5;

    while (hasMore && pageCount < maxPages) {
      let url = `${BASE_URL}/v2/projects?limit=${limit}`;
      if (status && status !== 'all') {
        url += `&status=${encodeURIComponent(status)}`;
      }
      if (nextCursor) {
        url += `&cursor=${encodeURIComponent(nextCursor)}`;
      }
      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      
      let newItemsFound = 0;
      for (const item of items) {
        if (item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
          newItemsFound++;
        }
      }

      // If no new items found or fewer items than limit, stop immediately (prevents Holded infinite cursor loop bug)
      if (items.length < limit || newItemsFound === 0 || !res?.has_more || !res?.cursor || res.cursor === nextCursor) {
        hasMore = false;
        break;
      }

      nextCursor = res.cursor;
      pageCount++;
    }

    return allItems.map(mapProjectToV1);
  },
  getProject: async (apiKey: string, projectId: string) => {
    if (!projectId) throw new Error("projectId is required");
    const res = await fetchHolded(`${BASE_URL}/v2/projects/${projectId}`, apiKey);
    return mapProjectToV1(res);
  },
  getProjectSummary: async (apiKey: string, projectId: string) => {
    if (!projectId) throw new Error("projectId is required");
    return fetchHolded(`${BASE_URL}/v2/projects/${projectId}/summary`, apiKey);
  },
  createProject: async (apiKey: string, project: any) => {
    return fetchHolded(`${BASE_URL}/v2/projects`, apiKey, {
      method: 'POST',
      body: JSON.stringify(mapProjectToV2Payload(project))
    });
  },
  updateProject: async (apiKey: string, projectId: string, project: any) => {
    if (!projectId) throw new Error("projectId is required");
    return fetchHolded(`${BASE_URL}/v2/projects/${projectId}`, apiKey, {
      method: 'PUT',
      body: JSON.stringify(mapProjectUpdateToV2Payload(project))
    });
  },
  deleteProject: async (apiKey: string, projectId: string) => {
    if (!projectId) throw new Error("projectId is required");
    return fetchHolded(`${BASE_URL}/v2/projects/${projectId}`, apiKey, {
      method: 'DELETE'
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
    
    return [
      { id: "0", name: "Por hacer", type: 0 },
      { id: "1", name: "En progreso", type: 1 },
      { id: "2", name: "Completado", type: 2 }
    ];
  },
  getTasks: async (apiKey: string, cursor?: string, limit: number = 100) => {
    if (cursor) {
      let url = `${BASE_URL}/v2/tasks?limit=${limit}&cursor=${encodeURIComponent(cursor)}`;
      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      return items.map(mapTaskToV1);
    }

    let allItems: any[] = [];
    const seenIds = new Set<string>();
    let nextCursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 5;

    while (hasMore && pageCount < maxPages) {
      let url = `${BASE_URL}/v2/tasks?limit=${limit}`;
      if (nextCursor) url += `&cursor=${encodeURIComponent(nextCursor)}`;
      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      
      let newItemsFound = 0;
      for (const item of items) {
        if (item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
          newItemsFound++;
        }
      }

      if (items.length < limit || newItemsFound === 0 || !res?.has_more || !res?.cursor || res.cursor === nextCursor) {
        hasMore = false;
        break;
      }

      nextCursor = res.cursor;
      pageCount++;
    }

    return allItems.map(mapTaskToV1);
  },
  getTask: async (apiKey: string, taskId: string) => {
    if (!taskId) throw new Error("taskId is required");
    const res = await fetchHolded(`${BASE_URL}/v2/tasks/${taskId}`, apiKey);
    return mapTaskToV1(res);
  },
  createTask: async (apiKey: string, task: any) => {
    return fetchHolded(`${BASE_URL}/v2/tasks`, apiKey, {
      method: 'POST',
      body: JSON.stringify(mapTaskToV2Payload(task))
    });
  },
  updateTask: async (apiKey: string, taskId: string, task: any) => {
    if (!taskId) throw new Error("taskId is required");
    return fetchHolded(`${BASE_URL}/v2/tasks/${taskId}`, apiKey, {
      method: 'PUT',
      body: JSON.stringify(mapTaskUpdateToV2Payload(task))
    });
  },
  deleteTask: async (apiKey: string, taskId: string) => {
    if (!taskId) throw new Error("taskId is required");
    return fetchHolded(`${BASE_URL}/v2/tasks/${taskId}`, apiKey, {
      method: 'DELETE'
    });
  },
  addTimeTracking: async (apiKey: string, projectId: string, data: any) => {
    if (!projectId) throw new Error("projectId is required for addTimeTracking");
    const payload = mapTimeTrackingToV2Payload(data);
    const res = await fetchHolded(`${BASE_URL}/v2/projects/${projectId}/times`, apiKey, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    // Holded API v2 returns 201 { id: "" } without saving if user_id is a Team Employee ID
    // instead of a Holded Account/Project User ID. Detect and resolve automatically.
    if (!res || !res.id || String(res.id).trim() === '') {
      try {
        const [proj, empsRes] = await Promise.all([
          fetchHolded(`${BASE_URL}/v2/projects/${projectId}`, apiKey).catch(() => null),
          fetchHolded(`${BASE_URL}/v2/employees?limit=100`, apiKey).catch(() => null)
        ]);

        const emps = empsRes && empsRes.items ? empsRes.items : (Array.isArray(empsRes) ? empsRes : []);
        const matchedEmp = emps.find((e: any) => e.id === payload.user_id || e.holded_user_id === payload.user_id);

        let fallbackUserId: string | null = null;
        if (matchedEmp && matchedEmp.holded_user_id && matchedEmp.holded_user_id !== payload.user_id) {
          fallbackUserId = matchedEmp.holded_user_id;
        }

        if (!fallbackUserId && proj && proj.users && typeof proj.users === 'object') {
          const userIds = Object.keys(proj.users);
          if (matchedEmp) {
            const empNameLower = (matchedEmp.full_name || matchedEmp.name || '').toLowerCase().trim();
            const matchingProjUid = userIds.find(uid => {
              const pUserName = (proj.users[uid]?.name || '').toLowerCase().trim();
              return pUserName && empNameLower && (pUserName.includes(empNameLower) || empNameLower.includes(pUserName));
            });
            if (matchingProjUid) fallbackUserId = matchingProjUid;
          }
          if (!fallbackUserId && userIds.length > 0) {
            fallbackUserId = userIds[0];
          }
        }

        if (fallbackUserId && fallbackUserId !== payload.user_id) {
          const retryPayload = { ...payload, user_id: fallbackUserId };
          const retryRes = await fetchHolded(`${BASE_URL}/v2/projects/${projectId}/times`, apiKey, {
            method: "POST",
            body: JSON.stringify(retryPayload)
          });
          return { ...retryRes, resolvedUserId: fallbackUserId };
        }
      } catch (e) {
        console.warn("Fallback user_id resolution for addTimeTracking failed:", e);
      }
    }

    return { ...res, resolvedUserId: payload.user_id };
  },
  getProjectTimes: async (apiKey: string, projectId: string, cursor?: string, limit: number = 100) => {
    if (!projectId) throw new Error("projectId is required for getProjectTimes");
    if (cursor) {
      let url = `${BASE_URL}/v2/projects/${projectId}/times?limit=${limit}&cursor=${encodeURIComponent(cursor)}`;
      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      return items.map((t: any) => ({
        ...t,
        id: t.id,
        duration: Number(t.duration) || 0,
        taskId: t.task_id || t.taskId,
        userId: t.user_id || t.userId,
        userName: t.user_name || t.userName,
        description: t.description || t.desc,
        date: t.date,
        costPerHour: t.cost_per_hour || t.costPerHour,
        projectId: t.project_id || t.projectId || projectId
      }));
    }

    let allItems: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 10;

    while (hasMore && pageCount < maxPages) {
      let url = `${BASE_URL}/v2/projects/${projectId}/times?limit=${limit}`;
      if (nextCursor) url += `&cursor=${encodeURIComponent(nextCursor)}`;
      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      allItems.push(...items);

      if (res && res.has_more && res.cursor) {
        nextCursor = res.cursor;
        pageCount++;
      } else {
        hasMore = false;
      }
    }

    return allItems.map((t: any) => ({
      ...t,
      id: t.id,
      duration: Number(t.duration) || 0,
      taskId: t.task_id || t.taskId,
      userId: t.user_id || t.userId,
      userName: t.user_name || t.userName,
      description: t.description || t.desc,
      date: t.date,
      costPerHour: t.cost_per_hour || t.costPerHour,
      projectId: t.project_id || t.projectId || projectId
    }));
  },
  getProjectTime: async (apiKey: string, projectId: string, timeId: string) => {
    if (!projectId || !timeId) throw new Error("projectId and timeId are required");
    return fetchHolded(`${BASE_URL}/v2/projects/${projectId}/times/${timeId}`, apiKey);
  },
  updateTimeTracking: async (apiKey: string, projectId: string, timeId: string, data: any) => {
    if (!projectId || !timeId) throw new Error("projectId and timeId are required");
    return fetchHolded(`${BASE_URL}/v2/projects/${projectId}/times/${timeId}`, apiKey, {
      method: "PUT",
      body: JSON.stringify(mapTimeTrackingToV2Payload(data))
    });
  },
  deleteTimeTracking: async (apiKey: string, projectId: string, timeId: string) => {
    if (!projectId || !timeId) throw new Error("projectId and timeId are required");
    return fetchHolded(`${BASE_URL}/v2/projects/${projectId}/times/${timeId}`, apiKey, {
      method: "DELETE"
    });
  },
  getAllTimes: async (apiKey: string, cursor?: string, limit: number = 100) => {
    let allItems: any[] = [];
    const seenIds = new Set<string>();
    let nextCursor: string | null = cursor || null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = cursor ? 1 : 5;

    while (hasMore && pageCount < maxPages) {
      let url = `${BASE_URL}/v2/project-times?limit=${limit}`;
      if (nextCursor) url += `&cursor=${encodeURIComponent(nextCursor)}`;
      const res = await fetchHolded(url, apiKey);
      const items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      
      let newItemsFound = 0;
      for (const item of items) {
        if (item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
          newItemsFound++;
        }
      }

      if (items.length < limit || newItemsFound === 0 || !res?.has_more || !res?.cursor || res.cursor === nextCursor) {
        hasMore = false;
        break;
      }

      nextCursor = res.cursor;
      pageCount++;
    }

    // Format the items to match the nested array shape expected by the frontend
    return [
      {
        timeTracking: allItems.map((t: any) => ({
          id: t.id,
          duration: Number(t.duration) || 0,
          taskId: t.task_id || t.taskId,
          userId: t.user_id || t.userId,
          userName: t.user_name || t.userName,
          description: t.description || t.desc,
          date: t.date,
          costPerHour: t.cost_per_hour || t.costPerHour,
          projectId: t.project_id || t.projectId
        }))
      }
    ];
  }
};
