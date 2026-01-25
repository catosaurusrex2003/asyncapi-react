import { AsyncAPIDocumentInterface } from '@asyncapi/parser';
import { diff as asyncApiDiff } from '@asyncapi/diff';

export interface ChangedSection {
  sectionId: string;
  sectionType: 'info' | 'servers' | 'operations' | 'messages' | 'schemas';
  subsectionId?: string; // For operations, messages, schemas - the specific item ID
  jsonPointer?: string;
}

/**
 * Calculates the difference between two AsyncAPI documents using @asyncapi/diff
 * Returns an array of changed sections
 */
export class DiffHelper {
  static calculateDiff(
    oldDoc: AsyncAPIDocumentInterface | undefined,
    newDoc: AsyncAPIDocumentInterface | undefined,
  ): ChangedSection[] {
    const changes: ChangedSection[] = [];

    if (!oldDoc && !newDoc) {
      return changes;
    }

    if (!oldDoc && newDoc) {
      // Everything is new
      return this.getAllSections(newDoc);
    }

    if (oldDoc && !newDoc) {
      return changes;
    }

    if (!oldDoc || !newDoc) {
      return changes;
    }

    try {
      // Convert AsyncAPIDocumentInterface to plain JSON objects
      // The @asyncapi/diff library expects plain JSON, not the interface objects
      const oldJson = oldDoc.json();
      const newJson = newDoc.json();

      // Ensure we have valid JSON objects with asyncapi version
      if (!oldJson || !newJson || !oldJson.asyncapi || !newJson.asyncapi) {
        console.warn('Invalid AsyncAPI documents for diff - missing asyncapi version');
        return [];
      }

      // Use @asyncapi/diff library to compare
      const diffResult = asyncApiDiff(oldJson, newJson, {
        outputType: 'json',
      });

      // Get all changes (breaking, non-breaking, and unclassified)
      const breakingChanges = diffResult.breaking();
      const nonBreakingChanges = diffResult.nonBreaking();
      const unclassifiedChanges = diffResult.unclassified();
      
      // Combine all changes - convert to arrays if needed
      const allChanges: any[] = [];
      if (Array.isArray(breakingChanges)) {
        allChanges.push(...breakingChanges);
      }
      if (Array.isArray(nonBreakingChanges)) {
        allChanges.push(...nonBreakingChanges);
      }
      if (Array.isArray(unclassifiedChanges)) {
        allChanges.push(...unclassifiedChanges);
      }

      console.log("allChanges: ",allChanges);

      // Convert diff output to ChangedSection format
      const processedIds = new Set<string>();

      console.log("newDoc.json(): ",newDoc.json());

      allChanges.forEach((change: any) => {
        const jsonPointer = change?.path as string;

        console.log('jsonPointer', jsonPointer);
        
        if (processedIds.has(jsonPointer)) {
          return;
        }

        // Parse JSON pointer to extract section information
        // Format: /info, /servers/{id}, /channels/{channel}/publish, /components/messages/{id}, /components/schemas/{id}
        
        if (jsonPointer.startsWith('/info')) {
          if (!processedIds.has('introduction')) {
            changes.push({ sectionId: 'introduction', sectionType: 'info', jsonPointer: jsonPointer });
            processedIds.add('introduction');
          }
        } else if (jsonPointer.startsWith('/servers/')) {
          // Extract server ID from pointer like /servers/{serverId}
          const parts = jsonPointer.split('/');
          if (parts.length >= 3) {
            const serverId = parts[2];
            const sectionId = `server-${serverId}`;
            if (!processedIds.has(sectionId)) {
              changes.push({
                sectionId,
                jsonPointer: jsonPointer,
                sectionType: 'servers',
                subsectionId: serverId,
              });
              processedIds.add(sectionId);
            }
          }
        } else if (jsonPointer.startsWith('/channels/')) {
          // Extract channel and operation info from pointer like /channels/{channel}/publish
          // or /channels/{channel}/subscribe
          const parts = jsonPointer.split('/');
          if (parts.length >= 3) {
            const channelId = parts[2];
            // Try to find the operation ID from the channel
            try {
              const channel = newDoc.channels().get(channelId);
              if (channel) {
                // Find operations that use this channel
                const operations = newDoc.operations().all();
                const relatedOp = operations.find((op) => {
                  const opChannels = op.channels().all();
                  return opChannels.some((ch) => ch.address() === channel.address());
                });

                if (relatedOp) {
                  const opId = relatedOp.id();
                  const sectionId = `operation-${opId}`;
                  if (!processedIds.has(sectionId)) {
                    changes.push({
                      sectionId,
                      jsonPointer: jsonPointer,
                      sectionType: 'operations',
                      subsectionId: opId,
                    });
                    processedIds.add(sectionId);
                  }
                }
              }
            } catch (e) {
              // If we can't find the channel, skip it
            }
          }
        } else if (jsonPointer.startsWith('/components/messages/')) {
          // Extract message ID from pointer like /components/messages/{messageId}
          const parts = jsonPointer.split('/');
          if (parts.length >= 4) {
            const messageId = parts[3];
            const sectionId = `message-${messageId}`;
            if (!processedIds.has(sectionId)) {
              changes.push({
                sectionId,
                jsonPointer: jsonPointer,
                sectionType: 'messages',
                subsectionId: messageId,
              });
              processedIds.add(sectionId);
            }
          }
        } else if (jsonPointer.startsWith('/components/schemas/')) {
          // Extract schema ID from pointer like /components/schemas/{schemaId}
          const parts = jsonPointer.split('/');
          if (parts.length >= 4) {
            const schemaId = parts[3];
            const sectionId = `schema-${schemaId}`;
            if (!processedIds.has(sectionId)) {
              changes.push({
                sectionId,
                jsonPointer: jsonPointer,
                sectionType: 'schemas',
                subsectionId: schemaId,
              });
              processedIds.add(sectionId);
            }
          }
        }
      });

      console.log("processedIds: ",processedIds);
    } catch (error) {
      // If diff calculation fails, fall back to simple comparison
      console.warn('Failed to calculate diff using @asyncapi/diff:', error);
      return [];
    }

    return changes;
  }
  private static getAllSections(
    doc: AsyncAPIDocumentInterface,
  ): ChangedSection[] {
    const sections: ChangedSection[] = [];

    if (doc.info()) {
      sections.push({ sectionId: 'introduction', sectionType: 'info', jsonPointer: '/info' });
    }

    doc.servers().all().forEach((server) => {
      sections.push({
        sectionId: `server-${server.id()}`,
        jsonPointer: `/servers/${server.id()}`,
        sectionType: 'servers',
        subsectionId: server.id(),
      });
    });

    doc.operations().all().forEach((op) => {
      sections.push({
        sectionId: `operation-${op.id()}`,
        jsonPointer: `/operations/${op.id()}`,
        sectionType: 'operations',
        subsectionId: op.id(),
      });
    });

    if (!doc.components().isEmpty()) {
      doc.components().messages().all().forEach((msg) => {
        sections.push({
          sectionId: `message-${msg.id()}`,
          jsonPointer: `/components/messages/${msg.id()}`,
          sectionType: 'messages',
          subsectionId: msg.id(),
        });
      });

      doc.components().schemas().all().forEach((schema) => {
        sections.push({
          sectionId: `schema-${schema.id()}`,
          sectionType: 'schemas',
          subsectionId: schema.id(),
        });
      });
    }

    return sections;
  }
}