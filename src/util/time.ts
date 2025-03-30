/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export function remainingTimeString(until: number): string {
    const remaining = until - Date.now();
    if (remaining < 0) return "0 seconds";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.ceil((remaining % (1000 * 60)) / 1000);
    if (hours > 0) return `${hours} hours`;
    if (minutes > 0) return `${minutes} minutes`;
    return `${seconds} seconds`;
}

export function formatDuration(durationMs: number): string {
    const seconds = Math.floor((durationMs / 1000) % 60);
    const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
    const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days} day(s)`);
    if (hours > 0) parts.push(`${hours} hour(s)`);
    if (minutes > 0) parts.push(`${minutes} minute(s)`);
    if (seconds > 0) parts.push(`${seconds} second(s)`);

    return parts.join(", ");
}