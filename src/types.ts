/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Bulletin {
  id: string;
  title: string;
  date: string;
  fileUrl: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Sermon {
  id: string;
  title: string;
  date: string;
  videoUrl: string;
  speaker: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ChurchInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  pastor: string;
}

export interface AdminUser {
  id: string; // The user UID
  email: string;
  name?: string;
  createdAt?: number;
  addedBy?: string;
}

