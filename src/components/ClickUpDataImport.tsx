import { useState, useEffect } from 'react';
import {
    isAuthenticated,
    getTeams,
    getSpaces,
    getFolders,
    getFolderlessLists,
    getGoals,
    getGroups,
    getCustomTaskTypes,
    getTasks,
    getTask,
    getTaskTimeInStatus,
    getTimeEntries,
    durationToHours,
    transformClickUpTasks,
} from '../services/clickupApi';
import type {
    ClickUpTeam,
    ClickUpSpace,
    ClickUpList,
    ClickUpGoal,
    ClickUpGroup,
    ClickUpTimeEntry,
    DevelopmentTaskFromClickUp,
} from '../services/clickupApi';
import './ClickUpDataImport.css';

// Target team names you want to filter
const TARGET_TEAM_NAMES = ['Wordpress', 'Shopify', 'Webflow'];

interface ClickUpDataImportProps {
    onImport: (tasks: DevelopmentTaskFromClickUp[], members: string[]) => void;
    weekStart: string;
    weekEnd: string;
}

interface TeamMember {
    id: number;
    username: string;
    email: string;
}

function ClickUpDataImport({ onImport, weekStart, weekEnd }: ClickUpDataImportProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [teams, setTeams] = useState<ClickUpTeam[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [, setSpaces] = useState<ClickUpSpace[]>([]);
    const [, setSelectedSpaceId] = useState<string>('');
    const [allLists, setAllLists] = useState<ClickUpList[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>('');
    const [goals, setGoals] = useState<ClickUpGoal[]>([]);
    const [selectedGoalId, setSelectedGoalId] = useState<string>('');
    const [groups, setGroups] = useState<ClickUpGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [listsWithMemberTasks, setListsWithMemberTasks] = useState<Set<string>>(new Set());
    const [, setCustomTaskTypes] = useState<Array<{ id: number; name: string }>>([]);
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [fetchedTasks, setFetchedTasks] = useState<DevelopmentTaskFromClickUp[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [timeEntries, setTimeEntries] = useState<ClickUpTimeEntry[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        if (isAuthenticated()) {
            loadTeams();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadTeams = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getTeams();
            // Filter teams to only show target teams or show all if none match

            const filteredTeams = response.teams.filter(team =>
                TARGET_TEAM_NAMES.some(name =>
                    team.name.toLowerCase().includes(name.toLowerCase())
                )
            );

            const finalTeams = filteredTeams.length > 0 ? filteredTeams : response.teams;
            setTeams(finalTeams);

            // Extract all members from all teams
            const allMembers: TeamMember[] = [];
            response.teams.forEach(team => {
                team.members.forEach(member => {
                    if (!allMembers.find(m => m.id === member.user.id)) {
                        allMembers.push({
                            id: member.user.id,
                            username: member.user.username,
                            email: member.user.email,
                        });
                    }
                });
            });
            setTeamMembers(allMembers);

            // Auto-select if only one team and load all dependent data
            if (finalTeams.length === 1) {
                const autoTeamId = finalTeams[0].id;
                setSelectedTeamId(autoTeamId);
                // Set team members for the selected team
                const members = finalTeams[0].members.map(m => ({
                    id: m.user.id,
                    username: m.user.username,
                    email: m.user.email,
                }));
                setTeamMembers(members);
                // Load all dependent data
                loadSpaces(autoTeamId);
                loadGoals(autoTeamId);
                loadGroups(autoTeamId);
                loadCustomTaskTypes(autoTeamId);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load teams');
        } finally {
            setIsLoading(false);
        }
    };

    const loadSpaces = async (teamId: string) => {
        setIsLoading(true);
        setError(null);
        setSpaces([]);
        setAllLists([]);
        setSelectedSpaceId('');
        setSelectedListId('');

        try {
            const response = await getSpaces(teamId);
            setSpaces(response.spaces);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load spaces');
        } finally {
            setIsLoading(false);
        }
    };
    // Filtered lists (currently using allLists directly)
    const _filteredLists = selectedGroupId && listsWithMemberTasks.size > 0
        ? allLists.filter(list => listsWithMemberTasks.has(list.id))
        : allLists;
    void _filteredLists; // Suppress unused warning

    const loadListsForGroupMembers = async (groupId: string) => {
        if (!selectedTeamId || !groupId) return;

        const selectedGroup = groups.find(g => g.id === groupId);
        if (!selectedGroup) return;

        // Don't filter lists - show all lists
        // The actual filtering happens when fetching tasks/time entries
        setListsWithMemberTasks(new Set());
    };

    const loadFoldersAndLists = async (spaceId: string) => {
        setIsLoading(true);
        setError(null);
        setAllLists([]);
        setSelectedListId('');

        try {
            const [foldersResponse, folderlessListsResponse] = await Promise.all([
                getFolders(spaceId),
                getFolderlessLists(spaceId),
            ]);

            // Combine folderless lists with lists from folders
            const loadedLists: ClickUpList[] = [];

            // First add folder-based lists with folder prefix and store folderName
            foldersResponse.folders.forEach(folder => {
                folder.lists.forEach(list => {
                    loadedLists.push({
                        ...list,
                        name: `${folder.name} → ${list.name}`,
                        folderName: folder.name,
                    });
                });
            });

            // Then add folderless lists (no folder association)
            folderlessListsResponse.lists.forEach(list => {
                loadedLists.push(list);
            });

            setAllLists(loadedLists);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load folders and lists');
        } finally {
            setIsLoading(false);
        }
    };

    const loadGoals = async (teamId: string) => {
        try {
            const response = await getGoals(teamId);
            setGoals(response.goals || []);
        } catch (err) {
            // Goals might not be available - that's ok, just don't show them
            console.log('Goals not available:', err);
            setGoals([]);
        }
    };

    const loadGroups = async (teamId: string) => {
        try {
            const response = await getGroups(teamId);
            setGroups(response.groups || []);
        } catch (err) {
            // Groups might not be available - that's ok
            console.log('User groups not available:', err);
            setGroups([]);
        }
    };

    const loadCustomTaskTypes = async (teamId: string) => {
        try {
            const response = await getCustomTaskTypes(teamId);
            // Filter to show useful custom types (like milestones)
            const types = response.custom_items || [];
            setCustomTaskTypes(types.map(t => ({ id: t.id, name: t.name })));
        } catch (err) {
            // Custom task types might not be available - that's ok
            console.log('Custom task types not available:', err);
            setCustomTaskTypes([]);
        }
    };

    const handleTeamChange = (teamId: string) => {
        setSelectedTeamId(teamId);
        setSelectedGoalId('');
        setSelectedMilestoneId('');
        setSelectedGroupId('');
        if (teamId) {
            // Update team members for selected team
            const selectedTeam = teams.find(t => t.id === teamId);
            if (selectedTeam) {
                const members = selectedTeam.members.map(m => ({
                    id: m.user.id,
                    username: m.user.username,
                    email: m.user.email,
                }));
                setTeamMembers(members);
            }
            loadSpaces(teamId);
            loadGoals(teamId);
            loadGroups(teamId);
            loadCustomTaskTypes(teamId);
        }
    };

    const _handleSpaceChange = (spaceId: string) => {
        setSelectedSpaceId(spaceId);
        if (spaceId) {
            loadFoldersAndLists(spaceId);
        }
    };
    void _handleSpaceChange; // Suppress unused warning

    const handleGroupChange = (groupId: string) => {
        setSelectedGroupId(groupId);
        if (groupId) {
            // Filter team members to only show members of the selected group
            const selectedGroup = groups.find(g => g.id === groupId);
            if (selectedGroup) {
                const groupMembers = selectedGroup.members.map(m => ({
                    id: m.id,
                    username: m.username,
                    email: m.email,
                }));
                setTeamMembers(groupMembers);
            }
            // Load lists where these members have tasks
            loadListsForGroupMembers(groupId);
        } else {
            // Reset to all team members when "All" is selected
            const selectedTeam = teams.find(t => t.id === selectedTeamId);
            if (selectedTeam) {
                const members = selectedTeam.members.map(m => ({
                    id: m.user.id,
                    username: m.user.username,
                    email: m.user.email,
                }));
                setTeamMembers(members);
            }
            setListsWithMemberTasks(new Set());
        }
        // Clear selected members and list when group changes
        setSelectedMembers([]);
        setSelectedListId('');
    };

    const handleMemberToggle = (memberId: number) => {
        // Single select logic:
        // If clicking currently selected member, unselect it.
        // If clicking a new member, select ONLY that member.
        setSelectedMembers(prev =>
            prev.includes(memberId) ? [] : [memberId]
        );
    };

    // Fetch tasks to show in preview (only tasks with time logged this week)
    const fetchData = async () => {
        if (!selectedTeamId) {
            setError('Please select a team');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Calculate date range in milliseconds
            const startTimestamp = new Date(weekStart).getTime();
            const endTimestamp = new Date(weekEnd).getTime() + (24 * 60 * 60 * 1000 - 1); // End of day

            // Fetch time entries for the selected team and date range
            const timeEntriesResponse = await getTimeEntries(selectedTeamId, {
                startDate: startTimestamp,
                endDate: endTimestamp,
                listId: selectedListId || undefined,
                assignees: selectedMembers.length > 0 ? selectedMembers : undefined,
            });

            setTimeEntries(timeEntriesResponse.data);

            // Create maps for task hours and task IDs that have time logged
            const timeByTask: Record<string, number> = {};
            const taskIdsWithTime = new Set<string>();
            const taskInfoFromEntries: Record<string, { name: string; assignee: string; userId: number }> = {};

            timeEntriesResponse.data.forEach(entry => {
                if (entry.task?.id) {
                    taskIdsWithTime.add(entry.task.id);

                    if (!timeByTask[entry.task.id]) {
                        timeByTask[entry.task.id] = 0;
                    }
                    timeByTask[entry.task.id] += durationToHours(entry.duration);

                    // Store task info from time entry
                    if (!taskInfoFromEntries[entry.task.id]) {
                        taskInfoFromEntries[entry.task.id] = {
                            name: entry.task.name,
                            assignee: entry.user.username,
                            userId: entry.user.id,
                        };
                    }
                }
            });

            // If no time entries found
            if (taskIdsWithTime.size === 0) {
                setFetchedTasks([]);
                setSelectedTaskIds(new Set());
                setShowPreview(true);
                return;
            }

            // If we have a list selected, fetch full task details for proper status/due date
            let transformedTasks: DevelopmentTaskFromClickUp[] = [];

            if (selectedListId) {
                // Build custom_items array for milestone filtering
                const customItems: number[] = [];
                if (selectedMilestoneId) {
                    customItems.push(parseInt(selectedMilestoneId, 10));
                }

                const tasksResponse = await getTasks(selectedListId, {
                    include_closed: true,
                    custom_items: customItems.length > 0 ? customItems : undefined,
                });

                // Transform and filter to only tasks with time logged this week
                const allTransformed = transformClickUpTasks(tasksResponse.tasks, timeByTask);
                transformedTasks = allTransformed.filter(task => taskIdsWithTime.has(task.id));
            } else {
                // No list selected - fetch individual task details for each task ID
                const taskDetailsPromises = Array.from(taskIdsWithTime).map(async (taskId) => {
                    try {
                        // Fetch task details and time in status in parallel
                        const [taskDetail, timeInStatus] = await Promise.all([
                            getTask(taskId, false),
                            getTaskTimeInStatus(taskId).catch(() => null) // Catch error if ClickApp not enabled
                        ]);

                        // console.log(`=== Task ${taskId} Debug ===`);
                        // console.log('Task Detail:', taskDetail);
                        //console.log('Time in Status:', timeInStatus);
                        // console.log('Task Status:', taskDetail.status);

                        const info = taskInfoFromEntries[taskId];

                        // Format due date
                        let dueDate = '';
                        if (taskDetail.due_date) {
                            const dueDateObj = new Date(typeof taskDetail.due_date === 'number'
                                ? taskDetail.due_date
                                : parseInt(taskDetail.due_date, 10));
                            dueDate = dueDateObj.toISOString().split('T')[0];
                        }

                        // COMPLETED DATE LOGIC
                        // Source: 'time_in_status' API
                        // We find when the task entered "complete" (done) status
                        let statusChangeDate = '';

                        if (timeInStatus) {
                            const targetStatus = 'task-completed';
                            // Helper to normalize status string (remove spaces, hyphens, lowercase)
                            const normalize = (s: string) => s ? s.toLowerCase().replace(/[\s-]+/g, '') : '';

                            // 1. Check if CURRENT status is 'complete'
                            if (timeInStatus.current_status && normalize(timeInStatus.current_status.status) === targetStatus) {
                                if (timeInStatus.current_status.total_time?.since) {
                                    const changeDate = new Date(parseInt(timeInStatus.current_status.total_time.since, 10));
                                    statusChangeDate = changeDate.toISOString().split('T')[0];
                                }
                            }

                            // 2. Check HISTORY for 'complete' status
                            if (!statusChangeDate && timeInStatus.status_history) {
                                const historyItem = timeInStatus.status_history.find(item => normalize(item.status) === targetStatus);
                                if (historyItem && historyItem.total_time?.since) {
                                    const changeDate = new Date(parseInt(historyItem.total_time.since, 10));
                                    statusChangeDate = changeDate.toISOString().split('T')[0];
                                }
                            }

                            // 3. Fallback: If 'complete' not found, use current status 'since'
                            if (!statusChangeDate && timeInStatus.current_status && timeInStatus.current_status.total_time?.since) {
                                const changeDate = new Date(parseInt(timeInStatus.current_status.total_time.since, 10));
                                statusChangeDate = changeDate.toISOString().split('T')[0];
                            }
                        }

                        // 4. FALLBACK: Use date_updated (Approximate) if Time in Status API failed or returned nothing
                        if (!statusChangeDate && taskDetail.date_updated) {
                            const updatedTimestamp = typeof taskDetail.date_updated === 'number'
                                ? taskDetail.date_updated
                                : parseInt(taskDetail.date_updated, 10);
                            const updatedDate = new Date(updatedTimestamp);
                            statusChangeDate = updatedDate.toISOString().split('T')[0];
                        }

                        // 5. LAST RESORT: Use date_closed or date_done
                        if (!statusChangeDate) {
                            const closedTimestamp = taskDetail.date_closed || taskDetail.date_done;
                            if (closedTimestamp) {
                                const closedDateObj = new Date(typeof closedTimestamp === 'number'
                                    ? closedTimestamp
                                    : parseInt(closedTimestamp, 10));
                                statusChangeDate = closedDateObj.toISOString().split('T')[0];
                            }
                        }

                        return {
                            id: taskId,
                            taskName: taskDetail.name || info?.name || 'Unknown Task',
                            taskId: taskId,
                            assignee: info?.assignee || '',
                            hoursLogged: timeByTask[taskId] || 0,
                            dueDate: dueDate,
                            completedDate: statusChangeDate, // Passing to 'completedDate' field for table display
                            isCompleted: taskDetail.status?.type === 'closed',
                            isOnTime: false,
                            status: taskDetail.status?.status || 'Unknown',
                            isSubtask: !!taskDetail.parent,
                        };
                    } catch (error) {
                        console.error(`Failed to fetch task ${taskId}:`, error);
                        const info = taskInfoFromEntries[taskId];
                        // Fallback to basic info if task fetch fails
                        return {
                            id: taskId,
                            taskName: info?.name || 'Unknown Task',
                            taskId: taskId,
                            assignee: info?.assignee || '',
                            hoursLogged: timeByTask[taskId] || 0,
                            dueDate: '',
                            completedDate: '',
                            isCompleted: false,
                            isOnTime: false,
                            status: 'Unknown',
                            isSubtask: false,
                        };
                    }
                });

                transformedTasks = await Promise.all(taskDetailsPromises);
            }

            // If members are selected, filter by assignee
            if (selectedMembers.length > 0) {
                const selectedMemberUsernames = teamMembers
                    .filter(m => selectedMembers.includes(m.id))
                    .map(m => m.username.toLowerCase());

                transformedTasks = transformedTasks.filter(task =>
                    task.assignee && selectedMemberUsernames.includes(task.assignee.toLowerCase())
                );
            }

            // If a goal is selected, filter tasks to only those in the goal's key results
            if (selectedGoalId) {
                const selectedGoal = goals.find(g => g.id === selectedGoalId);
                if (selectedGoal) {
                    // Collect all task IDs from the goal's key results
                    const goalTaskIds = new Set<string>();
                    selectedGoal.key_results.forEach(kr => {
                        kr.task_ids.forEach(id => goalTaskIds.add(id));
                    });

                    transformedTasks = transformedTasks.filter(task =>
                        goalTaskIds.has(task.id) || goalTaskIds.has(task.taskId)
                    );
                }
            }

            setFetchedTasks(transformedTasks);

            // Clear selection and show preview
            setSelectedTaskIds(new Set());
            setShowPreview(true);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data from ClickUp');
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle task selection
    const toggleTaskSelection = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    // Select all visible tasks
    const selectAllTasks = () => {
        const visibleTasks = getFilteredTasks();
        setSelectedTaskIds(new Set(visibleTasks.map(t => t.id)));
    };

    // Deselect all tasks
    const deselectAllTasks = () => {
        setSelectedTaskIds(new Set());
    };

    // Get filtered tasks based on status filter
    const getFilteredTasks = () => {
        if (statusFilter === 'all') {
            return fetchedTasks;
        }
        return fetchedTasks.filter(task =>
            task.status.toLowerCase().includes(statusFilter.toLowerCase())
        );
    };

    const handleImport = () => {
        // Get only selected tasks
        const tasksToImport = fetchedTasks.filter(task => selectedTaskIds.has(task.id));

        if (tasksToImport.length === 0) {
            setError('Please select at least one task to import');
            return;
        }

        // Get unique member names
        const memberNames = teamMembers.map(m => m.username);

        onImport(tasksToImport, memberNames);

        // Show success message
        setSuccessMessage(`✓ Imported ${tasksToImport.length} tasks from ClickUp`);
        setShowPreview(false);
        setSelectedTaskIds(new Set());

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    // Calculate summary stats
    const totalHoursLogged = timeEntries.reduce((sum, entry) =>
        sum + durationToHours(entry.duration), 0
    );

    const hoursByMember = timeEntries.reduce((acc, entry) => {
        const username = entry.user.username;
        if (!acc[username]) {
            acc[username] = 0;
        }
        acc[username] += durationToHours(entry.duration);
        return acc;
    }, {} as Record<string, number>);

    if (!isAuthenticated()) {
        return (
            <div className="clickup-import-notice">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p>Connect to ClickUp to import data automatically</p>
            </div>
        );
    }

    return (
        <div className="clickup-import">
            <div className="import-header">
                <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Import from ClickUp
                </h3>
            </div>

            {error && (
                <div className="import-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="import-success">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {successMessage}
                </div>
            )}

            <div className="import-filters">
                {/* Show Team dropdown only when there are multiple teams */}
                {teams.length > 1 && (
                    <div className="filter-row">
                        <div className="filter-group filter-group-wide">
                            <label>Team (Workspace)</label>
                            <select
                                value={selectedTeamId}
                                onChange={(e) => handleTeamChange(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="">Select a team...</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="filter-row">
                    {groups.length > 0 && (
                        <div className="filter-group filter-group-wide">
                            <label>Sub-Team</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => handleGroupChange(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="">-- All Groups --</option>
                                {groups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.name} ({group.members.length} members)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>


                {teamMembers.length > 0 && (
                    <div className="members-section">
                        <div className="members-header">
                            <label>Select Team Member (Required)</label>
                        </div>
                        <div className="members-grid">
                            {teamMembers.map(member => (
                                <label key={member.id} className="member-checkbox">
                                    <input
                                        type="radio"
                                        checked={selectedMembers.includes(member.id)}
                                        onChange={() => handleMemberToggle(member.id)}
                                        name="team-member-selection"
                                    />
                                    <span className="member-name">{member.username}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div className="import-actions">
                    <button
                        className="btn btn-primary"
                        onClick={fetchData}
                        disabled={isLoading || !selectedTeamId}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Fetching...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="1 4 1 10 7 10" />
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                </svg>
                                Fetch Data
                            </>
                        )}
                    </button>
                </div>
            </div>

            {showPreview && (
                <div className="import-preview">
                    <div className="preview-header">
                        <h4>Tasks with Time Logged This Week</h4>
                        <div className="preview-stats">
                            <span className="stat">
                                <strong>{fetchedTasks.length}</strong> tasks
                            </span>
                            <span className="stat">
                                <strong>{totalHoursLogged.toFixed(1)}</strong> total hours
                            </span>
                        </div>
                    </div>

                    {Object.keys(hoursByMember).length > 0 && (
                        <div className="hours-by-member">
                            <h5>Hours by Team Member This Week</h5>
                            <div className="member-hours-grid">
                                {Object.entries(hoursByMember)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([username, hours]) => {
                                        const taskCount = fetchedTasks.filter(t =>
                                            t.assignee?.toLowerCase() === username.toLowerCase()
                                        ).length;
                                        return (
                                            <div key={username} className="member-hours-item">
                                                <div className="member-info">
                                                    <span className="member-name">{username}</span>
                                                    <span className="member-tasks">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
                                                </div>
                                                <span className="member-hours">{hours.toFixed(1)}h</span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    <div className="preview-filter">
                        <label>Filter by Status</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Statuses</option>
                            <option value="inprogress">In Progress</option>
                            <option value="waiting">Waiting for Review</option>
                            <option value="complete">Completed</option>
                            <option value="done">Done</option>
                        </select>
                    </div>

                    {fetchedTasks.length > 0 && (
                        <>
                            <div className="task-selection-header">
                                <div className="selection-info">
                                    <strong>{selectedTaskIds.size}</strong> of <strong>{getFilteredTasks().length}</strong> tasks selected
                                </div>
                                <div className="selection-actions">
                                    <button className="link-btn" onClick={selectAllTasks}>Select All</button>
                                    <button className="link-btn" onClick={deselectAllTasks}>Deselect All</button>
                                </div>
                            </div>
                            <div className="preview-table-container">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            <th className="th-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTaskIds.size === getFilteredTasks().length && getFilteredTasks().length > 0}
                                                    onChange={(e) => e.target.checked ? selectAllTasks() : deselectAllTasks()}
                                                />
                                            </th>
                                            <th>Task Name</th>
                                            <th>Assignee</th>
                                            <th>Hours</th>
                                            <th>Last Week Time Logs</th>
                                            <th>Due Date</th>
                                            <th>Status</th>
                                            <th>Completed Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getFilteredTasks().map(task => (
                                            <tr
                                                key={task.id}
                                                className={selectedTaskIds.has(task.id) ? 'row-selected' : ''}
                                                onClick={() => toggleTaskSelection(task.id)}
                                            >
                                                <td className="td-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTaskIds.has(task.id)}
                                                        onChange={() => toggleTaskSelection(task.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="task-name">{task.taskName}</td>
                                                <td>{task.assignee || '-'}</td>
                                                <td>{task.hoursLogged.toFixed(1)}h</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="inline-input"
                                                        placeholder="0.0"
                                                        step="0.1"
                                                        min="0"
                                                        value={task.lastWeekHours ?? ''}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                            setFetchedTasks(prev => prev.map(t =>
                                                                t.id === task.id ? { ...t, lastWeekHours: val } : t
                                                            ));
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td>{task.dueDate || '-'}</td>
                                                <td>
                                                    <span className={`status-pill status-${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td>{task.completedDate || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    <div className="preview-actions">
                        <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleImport}
                            disabled={selectedTaskIds.size === 0}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Import {selectedTaskIds.size} Selected Tasks
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClickUpDataImport;
