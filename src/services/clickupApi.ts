/**
 * ClickUp API Service
 * Handles authentication and data fetching from ClickUp
 */

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

// Types for ClickUp API responses
export interface ClickUpTeam {
    id: string;
    name: string;
    color: string;
    avatar: string | null;
    members: ClickUpMember[];
}

export interface ClickUpMember {
    user: {
        id: number;
        username: string;
        email: string;
        color: string;
        profilePicture: string | null;
    };
}

export interface ClickUpTask {
    id: string;
    name: string;
    status: {
        status: string;
        type: string;
        orderindex: number;
    };
    due_date: string | number | null; // Timestamp in ms (can be string or number)
    date_created: string | number;     // Timestamp in ms
    date_updated: string | number;     // Timestamp in ms
    date_closed?: string | number | null; // Timestamp when task was closed
    date_done?: string | number | null;   // Timestamp when task was marked done
    assignees: Array<{
        id: number;
        username: string;
        email: string;
        color: string;
    }>;
    time_spent?: number;
    custom_fields?: Array<{
        id: string;
        name: string;
        type: string;
        value?: unknown;
    }>;
    parent?: string | null; // Parent task ID if this is a subtask
    subtasks?: ClickUpTask[]; // Nested subtasks if available
    list?: {
        id: string;
        name: string;
    };
}

export interface ClickUpHistoryItem {
    id: string;
    type: number; // 1 = status change, 2 = assignee change, etc.
    date: string;
    field: string;
    parent_id: string;
    before?: {
        status?: string;
        color?: string;
        type?: string;
    };
    after?: {
        status?: string;
        color?: string;
        type?: string;
    };
}

export interface ClickUpComment {
    id: string;
    comment_text: string;
    date: number; // Timestamp in ms
    user: {
        id: number;
        username: string;
        email: string;
    };
    hist_items?: ClickUpHistoryItem[]; // Status changes and other history
}

export interface ClickUpTimeEntry {
    id: string;
    task: {
        id: string;
        name: string;
    };
    user: {
        id: number;
        username: string;
    };
    start: string;
    end: string;
    duration: number;
    billable: boolean;
}

export interface ClickUpSpace {
    id: string;
    name: string;
}

export interface ClickUpList {
    id: string;
    name: string;
    folderName?: string;
}

export interface ClickUpFolder {
    id: string;
    name: string;
    lists: ClickUpList[];
}

export interface ClickUpGoal {
    id: string;
    name: string;
    team_id: string;
    creator: number;
    color: string;
    due_date: string | null;
    start_date: string | null;
    folder_id: string | null;
    folder: {
        id: string;
        name: string;
    } | null;
    key_results: Array<{
        id: string;
        name: string;
        type: string;
        steps_current: number;
        steps_end: number;
        unit: string;
        task_ids: string[];
        list_ids: string[];
    }>;
}

export interface ClickUpGroupMember {
    id: number;
    username: string;
    email: string;
    color: string;
    initials: string;
    profilePicture: string | null;
}

export interface ClickUpGroup {
    id: string;
    team_id: string;
    userid: number;
    name: string;
    handle: string;
    date_created: string;
    initials: string;
    members: ClickUpGroupMember[];
    avatar: { attachment_id: string | null } | null;
}

// OAuth Configuration
export interface ClickUpOAuthConfig {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    redirectUri?: string;
}

// Get stored config from localStorage
export function getStoredConfig(): ClickUpOAuthConfig | null {
    const storedConfig = localStorage.getItem('clickup_config');
    if (storedConfig) {
        try {
            return JSON.parse(storedConfig);
        } catch {
            return null;
        }
    }
    return null;
}

// Store config in localStorage
export function storeConfig(config: ClickUpOAuthConfig): void {
    localStorage.setItem('clickup_config', JSON.stringify(config));
}

// Clear stored config
export function clearConfig(): void {
    localStorage.removeItem('clickup_config');
}

// Check if the user is authenticated
export function isAuthenticated(): boolean {
    const config = getStoredConfig();
    return !!(config?.accessToken);
}

// Generate OAuth URL for user authorization
export function getAuthorizationUrl(clientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
    });
    return `https://app.clickup.com/api?${params.toString()}`;
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string
): Promise<string> {
    const response = await fetch(`${CLICKUP_API_BASE}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.err || 'Failed to exchange code for token');
    }

    const data = await response.json();
    return data.access_token;
}

// Make authenticated API request
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const config = getStoredConfig();

    if (!config?.accessToken) {
        throw new Error('Not authenticated. Please connect to ClickUp first.');
    }

    const response = await fetch(`${CLICKUP_API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': config.accessToken,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ err: 'Unknown error' }));
        throw new Error(error.err || `API request failed: ${response.status}`);
    }

    return response.json();
}

// Get authorized user info
export async function getAuthorizedUser(): Promise<{ user: { id: number; username: string; email: string } }> {
    return apiRequest('/user');
}

// Get all teams (workspaces) the user has access to
export async function getTeams(): Promise<{ teams: ClickUpTeam[] }> {
    return apiRequest('/team');
}

// Get spaces for a team
export async function getSpaces(teamId: string): Promise<{ spaces: ClickUpSpace[] }> {
    return apiRequest(`/team/${teamId}/space`);
}

// Get folders in a space
export async function getFolders(spaceId: string): Promise<{ folders: ClickUpFolder[] }> {
    return apiRequest(`/space/${spaceId}/folder`);
}

// Get lists in a folder
export async function getListsInFolder(folderId: string): Promise<{ lists: ClickUpList[] }> {
    return apiRequest(`/folder/${folderId}/list`);
}

// Get folderless lists in a space
export async function getFolderlessLists(spaceId: string): Promise<{ lists: ClickUpList[] }> {
    return apiRequest(`/space/${spaceId}/list`);
}

// Get goals (milestones) for a team/workspace
export async function getGoals(teamId: string): Promise<{ goals: ClickUpGoal[] }> {
    return apiRequest(`/team/${teamId}/goal`);
}

// Get custom task types (includes Milestones) for a team
export async function getCustomTaskTypes(teamId: string): Promise<{ custom_items: Array<{ id: number; name: string; name_plural: string; avatar: { source: string; value: string } | null }> }> {
    return apiRequest(`/team/${teamId}/custom_item`);
}

// Get User Groups (sub-teams) for a workspace
// In ClickUp, "Teams" in the UI are "User Groups" in the API
// Endpoint: GET /group?team_id={team_id}
export async function getGroups(teamId: string, groupIds?: string[]): Promise<{ groups: ClickUpGroup[] }> {
    const params = new URLSearchParams();
    params.append('team_id', teamId);
    if (groupIds && groupIds.length > 0) {
        groupIds.forEach(id => params.append('group_ids', id));
    }
    return apiRequest(`/group?${params.toString()}`);
}

// Get tasks from a list (including subtasks and optionally milestones)
export async function getTasks(
    listId: string,
    options: {
        statuses?: string[];
        assignees?: number[];
        include_closed?: boolean;
        include_subtasks?: boolean;
        custom_items?: number[]; // Include custom task types (1 = milestones)
    } = {}
): Promise<{ tasks: ClickUpTask[] }> {
    const params = new URLSearchParams();

    if (options.statuses) {
        options.statuses.forEach(status => params.append('statuses[]', status));
    }
    if (options.assignees) {
        options.assignees.forEach(assignee => params.append('assignees[]', assignee.toString()));
    }
    if (options.include_closed) {
        params.append('include_closed', 'true');
    }
    // Include milestones and custom task types
    if (options.custom_items) {
        options.custom_items.forEach(item => params.append('custom_items[]', item.toString()));
    }
    // Always include subtasks by default
    params.append('subtasks', 'true');

    const queryString = params.toString();
    const endpoint = `/list/${listId}/task${queryString ? `?${queryString}` : ''}`;

    return apiRequest(endpoint);
}

// Get a single task by ID (with subtasks if requested)
export async function getTask(taskId: string, includeSubtasks: boolean = true): Promise<ClickUpTask> {
    const params = new URLSearchParams();
    if (includeSubtasks) {
        params.append('include_subtasks', 'true');
    }
    const queryString = params.toString();
    return apiRequest(`/task/${taskId}${queryString ? `?${queryString}` : ''}`);
}

// Get subtasks of a task
export async function getSubtasks(taskId: string): Promise<ClickUpTask[]> {
    // ClickUp API returns subtasks as part of the task object
    const task = await getTask(taskId, true);
    return task.subtasks || [];
}

// Get task comments and history (includes status changes)
export async function getTaskComments(taskId: string): Promise<{ comments: ClickUpComment[] }> {
    return apiRequest(`/task/${taskId}/comment`);
}

// Interface for time in status response
export interface TaskTimeInStatus {
    current_status: {
        status: string;
        color: string;
        type: string;
        orderindex: number;
        total_time: {
            by_minute: number;
            since: string; // Timestamp when task entered this status
        };
    };
    status_history: Array<{
        status: string;
        color: string;
        type: string;
        orderindex: number;
        total_time: {
            by_minute: number;
            since?: string; // Timestamp when task entered this status
        };
    }>;
}

// Get task time in status (shows when task entered each status)
export async function getTaskTimeInStatus(taskId: string): Promise<TaskTimeInStatus> {
    return apiRequest(`/task/${taskId}/time_in_status`);
}

// Get time entries for a team within a date range
export async function getTimeEntries(
    teamId: string,
    options: {
        startDate?: number; // Unix timestamp in milliseconds
        endDate?: number;   // Unix timestamp in milliseconds
        assignees?: number[];
        spaceId?: string;
        folderId?: string;
        listId?: string;
        taskId?: string;
    } = {}
): Promise<{ data: ClickUpTimeEntry[] }> {
    const params = new URLSearchParams();

    if (options.startDate) {
        params.append('start_date', options.startDate.toString());
    }
    if (options.endDate) {
        params.append('end_date', options.endDate.toString());
    }
    if (options.assignees) {
        options.assignees.forEach(assignee => params.append('assignee', assignee.toString()));
    }
    if (options.spaceId) {
        params.append('space_id', options.spaceId);
    }
    if (options.folderId) {
        params.append('folder_id', options.folderId);
    }
    if (options.listId) {
        params.append('list_id', options.listId);
    }
    if (options.taskId) {
        params.append('task_id', options.taskId);
    }

    const queryString = params.toString();
    const endpoint = `/team/${teamId}/time_entries${queryString ? `?${queryString}` : ''}`;

    return apiRequest(endpoint);
}

// Get all tasks for a team filtered by status
export async function getFilteredTasks(
    teamId: string,
    options: {
        statuses?: string[];
        assignees?: number[];
        dueDateGt?: number;   // Unix timestamp in milliseconds
        dueDateLt?: number;
        include_closed?: boolean;
    } = {}
): Promise<{ tasks: ClickUpTask[] }> {
    const params = new URLSearchParams();

    if (options.statuses) {
        options.statuses.forEach(status => params.append('statuses[]', status));
    }
    if (options.assignees) {
        options.assignees.forEach(assignee => params.append('assignees[]', assignee.toString()));
    }
    if (options.dueDateGt) {
        params.append('due_date_gt', options.dueDateGt.toString());
    }
    if (options.dueDateLt) {
        params.append('due_date_lt', options.dueDateLt.toString());
    }
    if (options.include_closed) {
        params.append('include_closed', 'true');
    }

    params.append('include_subtasks', 'true');

    const queryString = params.toString();
    const endpoint = `/team/${teamId}/task${queryString ? `?${queryString}` : ''}`;

    return apiRequest(endpoint);
}

// Helper: Convert ClickUp time entry duration (ms) to hours
export function durationToHours(durationMs: number): number {
    // ClickUp returns duration in milliseconds
    // A negative duration means the timer is currently running
    const abseDuration = Math.abs(durationMs);
    return abseDuration / (1000 * 60 * 60);
}

// Helper: Convert date to Unix timestamp in milliseconds
export function dateToTimestamp(date: Date | string): number {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getTime();
}

// Helper: Format Unix timestamp to date string
export function timestampToDateString(timestamp: number): string {
    return new Date(timestamp).toISOString().split('T')[0];
}

// Aggregate time entries by assignee
export function aggregateTimeByAssignee(
    timeEntries: ClickUpTimeEntry[]
): Record<string, { totalHours: number; userId: number }> {
    const result: Record<string, { totalHours: number; userId: number }> = {};

    for (const entry of timeEntries) {
        const username = entry.user.username;
        if (!result[username]) {
            result[username] = { totalHours: 0, userId: entry.user.id };
        }
        result[username].totalHours += durationToHours(entry.duration);
    }

    return result;
}

// Map ClickUp tasks to our DevelopmentTask format
export interface DevelopmentTaskFromClickUp {
    id: string;
    taskName: string;
    taskId: string;
    assignee: string;
    hoursLogged: number;
    lastWeekHours?: number; // Manual input: last week's time logs
    dueDate: string;
    completedDate: string;
    isCompleted: boolean;
    isOnTime: boolean;
    status: string;
    statusChangedDate?: string;
    isSubtask: boolean;
    parentTaskId?: string;
    parentTaskName?: string;
}

// Get completion status from ClickUp status
export function isTaskCompleted(status: { status: string; type: string }): boolean {
    // ClickUp uses 'closed' or 'done' type for completed tasks
    return status.type === 'closed' ||
        status.status.toLowerCase() === 'complete' ||
        status.status.toLowerCase() === 'done' ||
        status.status.toLowerCase().includes('closed');
}

// Transform a single ClickUp task to our format
function transformSingleTask(
    task: ClickUpTask,
    timeEntriesByTask: Record<string, number>,
    parentTask?: ClickUpTask
): DevelopmentTaskFromClickUp {
    // Handle due_date - ClickUp returns it as a string timestamp (ms) or null
    let dueDate = '';
    if (task.due_date !== null && task.due_date !== undefined) {
        try {
            // due_date could be a string or number timestamp in milliseconds
            const timestamp = Number(task.due_date);
            if (!isNaN(timestamp) && timestamp > 0) {
                dueDate = timestampToDateString(timestamp);
                console.log('Parsed due_date:', task.due_date, '->', dueDate);
            }
        } catch (e) {
            console.warn('Failed to parse due_date:', task.due_date, e);
        }
    }

    // Handle date_closed or date_done for completed date
    let completedDate = '';
    const closedTimestamp = task.date_closed || task.date_done;
    if (closedTimestamp !== null && closedTimestamp !== undefined) {
        try {
            const timestamp = Number(closedTimestamp);
            if (!isNaN(timestamp) && timestamp > 0) {
                completedDate = timestampToDateString(timestamp);
            }
        } catch (e) {
            console.warn('Failed to parse date_closed/date_done:', closedTimestamp, e);
        }
    }

    const isCompleted = isTaskCompleted(task.status);
    const isOnTime = isCompleted && dueDate && completedDate
        ? completedDate <= dueDate
        : false;

    const isSubtask = !!task.parent || !!parentTask;

    return {
        id: task.id,
        taskName: isSubtask ? `↳ ${task.name}` : task.name,
        taskId: task.id,
        assignee: task.assignees.length > 0 ? task.assignees[0].username : '',
        hoursLogged: timeEntriesByTask[task.id] || 0,
        dueDate,
        completedDate: isCompleted ? completedDate : '',
        isCompleted,
        isOnTime,
        status: task.status.status,
        isSubtask,
        parentTaskId: task.parent || parentTask?.id,
        parentTaskName: parentTask?.name,
    };
}

// Transform ClickUp tasks to our format (including subtasks)
export function transformClickUpTasks(
    tasks: ClickUpTask[],
    timeEntriesByTask: Record<string, number>
): DevelopmentTaskFromClickUp[] {
    const result: DevelopmentTaskFromClickUp[] = [];

    for (const task of tasks) {
        // Add the main task
        result.push(transformSingleTask(task, timeEntriesByTask));

        // Add any nested subtasks
        if (task.subtasks && task.subtasks.length > 0) {
            for (const subtask of task.subtasks) {
                result.push(transformSingleTask(subtask, timeEntriesByTask, task));

                // Handle deeply nested subtasks (subtasks of subtasks)
                if (subtask.subtasks && subtask.subtasks.length > 0) {
                    for (const nestedSubtask of subtask.subtasks) {
                        result.push(transformSingleTask(nestedSubtask, timeEntriesByTask, subtask));
                    }
                }
            }
        }
    }

    return result;
}

// Status types for tracking status changes
export const STATUS_INPROGRESS = 'INPROGRESS';
export const STATUS_WAITING_FOR_REVIEW = 'WAITING-FOR-INTERNAL-REVIEW';
