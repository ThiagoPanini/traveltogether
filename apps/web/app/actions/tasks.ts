"use server";

import type { TaskCreate, TaskStatus, TaskUpdate } from "@traveltogether/types";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/lib/api/tasks";

export async function createTaskAction(tripId: string, data: TaskCreate) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return createTask(session.apiAccessToken, tripId, data);
}

export async function updateTaskAction(taskId: string, data: TaskUpdate) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return updateTask(session.apiAccessToken, taskId, data);
}

export async function setTaskStatusAction(taskId: string, taskStatus: TaskStatus) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return setTaskStatus(session.apiAccessToken, taskId, taskStatus);
}

export async function deleteTaskAction(taskId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return deleteTask(session.apiAccessToken, taskId);
}
