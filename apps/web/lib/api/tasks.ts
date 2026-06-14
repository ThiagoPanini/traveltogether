import type { TaskCreate, TaskStatus, TaskUpdate, TaskWithAssignees } from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

export async function getTasks(accessToken: string, tripId: string): Promise<TaskWithAssignees[]> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/tasks`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as TaskWithAssignees[];
  } catch {
    return [];
  }
}

export async function getMyTasks(accessToken: string): Promise<TaskWithAssignees[]> {
  try {
    const response = await fetch(`${apiUrl()}/me/tasks`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as TaskWithAssignees[];
  } catch {
    return [];
  }
}

export async function createTask(
  accessToken: string,
  tripId: string,
  data: TaskCreate,
): Promise<TaskWithAssignees | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/tasks`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as TaskWithAssignees;
  } catch {
    return null;
  }
}

export async function updateTask(
  accessToken: string,
  taskId: string,
  data: TaskUpdate,
): Promise<TaskWithAssignees | null> {
  try {
    const response = await fetch(`${apiUrl()}/tasks/${taskId}`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as TaskWithAssignees;
  } catch {
    return null;
  }
}

export async function setTaskStatus(
  accessToken: string,
  taskId: string,
  taskStatus: TaskStatus,
): Promise<TaskWithAssignees | null> {
  try {
    const response = await fetch(`${apiUrl()}/tasks/${taskId}/status`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ status: taskStatus }),
    });
    if (!response.ok) return null;
    return (await response.json()) as TaskWithAssignees;
  } catch {
    return null;
  }
}

export async function deleteTask(accessToken: string, taskId: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/tasks/${taskId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
