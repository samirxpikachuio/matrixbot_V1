import sizeOf from 'image-size';
import * as mm from 'music-metadata';
import getVideoInfo from 'get-video-info';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

async function uploadFile(client, buffer, mimetype, filename) {
  try {
    const uploadResponse = await client.uploadContent(buffer, {
      type: mimetype,
      name: filename,
      rawResponse: false,
      onlyContentUri: false
    });
    return uploadResponse.content_uri; 
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

  export const MatrixBotHelpers = {
      
      
  
  
      async sendMessage(roomId, body) {
      await this.client.sendMessage(roomId, {
        msgtype: "m.text",
        body: typeof body === 'string' ? body : JSON.stringify(body)
      });
    },
    
    async createRoom(options) {
      return await this.client.createRoom(options);
    },
    
    async joinRoom(roomId) {
      return await this.client.joinRoom(roomId);
    },
    
    toggleSelfListening() {
      this.listenToSelf = !this.listenToSelf;
      return this.listenToSelf;
    },
    
    async getUserId() {
      return await this.client.getUserId();
    },
    
    // Original role management methods
    async getUserRole(userId, roomId) {
      const cacheKey = `${roomId}:${userId}`;
      if (this.roleCache.has(cacheKey)) {
        return this.roleCache.get(cacheKey);
      }
      
      try {
        const powerLevels = await this.client.getRoomStateEvent(roomId, "m.room.power_levels", ""); 
        let role = 0;  
        if (powerLevels.users && powerLevels.users[userId] !== undefined) {
          const powerLevel = powerLevels.users[userId];
          if (powerLevel >= 100) {
            role = 2; 
          } else if (powerLevel >= 50) {
            role = 1; 
          }
        }
        
        this.roleCache.set(cacheKey, role);
        return role;
      } catch (error) {
        console.error(`Error getting user role for ${userId} in ${roomId}:`, error);
        return 0; 
      }
    },
    
    clearRoleCache(roomId = null, userId = null) {
      if (!roomId && !userId) {
        this.roleCache.clear();
      } else if (roomId && !userId) {
        for (const key of this.roleCache.keys()) {
          if (key.startsWith(`${roomId}:`)) {
            this.roleCache.delete(key);
          }
        }
      } else if (!roomId && userId) {
        for (const key of this.roleCache.keys()) {
          if (key.endsWith(`:${userId}`)) {
            this.roleCache.delete(key);
          }
        }
      } else {   
        this.roleCache.delete(`${roomId}:${userId}`);
      }
    },
    
    async sendImage(roomId, imageBuffer, filename, caption = null) {
      try {
        const mxcUri = await uploadFile(this.client, imageBuffer, "image/jpeg", filename);
        
        
        let width = 800; 
        let height = 600; 
        


        const content = {
          msgtype: "m.image",
          body: filename || "Image",
          url: mxcUri,
          info: {
            mimetype: "image/jpeg",
            w: width,
            h: height,
          }
        };
        
        if (caption) {
          content.body = caption;
          content.caption = caption;
        }
        
        await this.client.sendMessage(roomId, content);
        return true;
      } catch (error) {
        console.error("Error sending image:", error);
        return false;
      }
    },
    async uploadImage(roomId, imageUrl, caption = '') {
      try {
      
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageType = imageResponse.headers['content-type'];
        const imageBuffer = Buffer.from(imageResponse.data);
        
      
        let width = 800; 
        let height = 600; 
        
        if (imageType.includes('image/')) {
          try {
            const sizeOf = require('image-size');
            const dimensions = sizeOf(imageBuffer);
            width = dimensions.width;
            height = dimensions.height;
          } catch (dimensionError) {
            console.warn('Could not determine image dimensions:', dimensionError);
          }
        }
        
        
        const uploadResponse = await this.client.uploadContent(imageResponse.data, {
          type: imageType,
          rawResponse: false,
          onlyContentUri: false
        });
        
        
        const matrixUrl = uploadResponse.content_uri;
        
        
        const info = {
          mimetype: imageType,
          w: width,
          h: height,
          size: imageResponse.data.length
        };
        
    
        const result = await this.client.sendMessage(roomId, {
          msgtype: "m.image",
          url: matrixUrl,
          body: caption || "Image",
          info: info
        });
        
        console.log('Image message sent successfully:', result);
        return result;
      } catch (error) {
        console.error('Failed to upload and send image:', error);
        throw error;
      }
    },

     async sendVideo(roomId, videoBuffer, filename, caption = null) {
      try {
        const mxcUri = await uploadFile(this.client, videoBuffer, "video/mp4", filename);
        
        const content = {
          msgtype: "m.video",
          body: filename || "Video",
          url: mxcUri,
          info: {
            mimetype: "video/mp4",
          }
        };
        
        if (caption) {
          content.body = caption;
          content.caption = caption;
        }
        
        await this.client.sendMessage(roomId, content);
        return true;
      } catch (error) {
        console.error("Error sending video:", error);
        return false;
      }
    },
      


    
    async uploadVideo(roomId, videoUrl, caption = '') {
      try {
        // Fetch the video
        const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        const videoType = videoResponse.headers['content-type'];
        const videoBuffer = Buffer.from(videoResponse.data);
        
        // Default video info
        let info = {
          mimetype: videoType,
          size: videoBuffer.length,
          duration: 0,
          w: 640,
          h: 360
        };
        
        // Try to get video metadata if possible
        try {
          const tempDir = os.tmpdir();
          const videoPath = path.join(tempDir, `video-${uuidv4()}.mp4`);
          fs.writeFileSync(videoPath, videoBuffer);
          
          // Get video metadata using ffprobe
          const metadata = await this.getVideoMetadata(videoPath);
          
          if (metadata && metadata.streams) {
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            if (videoStream) {
              info.w = videoStream.width || info.w;
              info.h = videoStream.height || info.h;
              
              if (metadata.format && metadata.format.duration) {
                info.duration = Math.floor(parseFloat(metadata.format.duration) * 1000);
              }
            }
          }
          
          // Clean up temp file
          if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
          }
        } catch (metadataError) {
          console.warn('Could not determine video metadata:', metadataError);
        }
        
        // Upload the video to Matrix server
        const uploadResponse = await this.client.uploadContent(videoBuffer, {
          type: videoType,
          rawResponse: false,
          onlyContentUri: false
        });
        
        const matrixUrl = uploadResponse.content_uri;
        
        // Generate and upload thumbnail
        let thumbnailUrl = null;
        try {
          const thumbnailBuffer = await this.generateVideoThumbnail(videoBuffer);
          const thumbnailUploadResponse = await this.client.uploadContent(thumbnailBuffer, {
            type: 'image/jpeg',
            rawResponse: false,
            onlyContentUri: false
          });
          thumbnailUrl = thumbnailUploadResponse.content_uri;
          
          // Get thumbnail dimensions
          const thumbnailDimensions = sizeOf(thumbnailBuffer);
          info.thumbnail_url = thumbnailUrl;
          info.thumbnail_info = {
            mimetype: 'image/jpeg',
            w: thumbnailDimensions.width,
            h: thumbnailDimensions.height,
            size: thumbnailBuffer.length
          };
        } catch (thumbnailError) {
          console.warn('Could not generate video thumbnail:', thumbnailError);
        }
        
        // Send the video message
        const result = await this.client.sendMessage(roomId, {
          msgtype: "m.video",
          url: matrixUrl,
          body: caption || "Video",
          info: info
        });
        
        console.log('Video message sent successfully:', result);
        return result;
      } catch (error) {
        console.error('Failed to upload and send video:', error);
        throw error;
      }
    },
    
    async generateVideoThumbnail(videoBuffer) {
      return new Promise((resolve, reject) => {
        const tempDir = os.tmpdir();
        const videoPath = path.join(tempDir, `video-${uuidv4()}.mp4`);
        const thumbPath = path.join(tempDir, `thumb-${uuidv4()}.jpg`);
        
        try {
          // Write video buffer to temp file
          fs.writeFileSync(videoPath, videoBuffer);
          
          // Extract thumbnail at 1 second mark
          ffmpeg(videoPath)
            .on('error', (err) => {
              console.error('FFmpeg error:', err);
              cleanup();
              reject(err);
            })
            .on('end', () => {
              try {
                // Read the thumbnail into a buffer
                const thumbnailBuffer = fs.readFileSync(thumbPath);
                cleanup();
                resolve(thumbnailBuffer);
              } catch (err) {
                cleanup();
                reject(err);
              }
            })
            .screenshots({
              timestamps: ['1'],
              filename: path.basename(thumbPath),
              folder: path.dirname(thumbPath),
              size: '320x?'
            });
        } catch (err) {
          cleanup();
          reject(err);
        }
        
        function cleanup() {
          // Clean up temporary files
          try {
            if (fs.existsSync(videoPath)) {
              fs.unlinkSync(videoPath);
            }
            if (fs.existsSync(thumbPath)) {
              fs.unlinkSync(thumbPath);
            }
          } catch (err) {
            console.warn('Error cleaning up temp files:', err);
          }
        }
      });
    },
    
    async getVideoMetadata(videoPath) {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) return reject(err);
          resolve(metadata);
        });
      });
    },


    async uploadAudio(roomId, audioUrl, caption = '') {
      try {
      
        const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const audioType = audioResponse.headers['content-type'];
        const audioBuffer = Buffer.from(audioResponse.data);
        
        // Default audio info
        let info = {
          mimetype: audioType,
          size: audioBuffer.length,
          duration: 0
        };
        
        // Try to get audio metadata if possible
        try {
          const tempDir = os.tmpdir();
          const audioPath = path.join(tempDir, `audio-${uuidv4()}.${getExtension(audioType)}`);
          
          fs.writeFileSync(audioPath, audioBuffer);
          
          const metadata = await mm.parseFile(audioPath);
          
          if (metadata && metadata.format) {
            // Get duration in milliseconds
            if (metadata.format.duration) {
              info.duration = Math.floor(metadata.format.duration * 1000);
            }
            
            // Add additional useful audio info
            if (metadata.common) {
              if (metadata.common.title) info.title = metadata.common.title;
              if (metadata.common.artist) info.artist = metadata.common.artist;
              if (metadata.common.album) info.album = metadata.common.album;
            }
          }
          
          // Clean up temp file
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
          }
        } catch (metadataError) {
          console.warn('Could not determine audio metadata:', metadataError);
        }
        
        // Upload the audio to Matrix server
        const uploadResponse = await this.client.uploadContent(audioBuffer, {
          type: audioType,
          rawResponse: false,
          onlyContentUri: false
        });
        
        const matrixUrl = uploadResponse.content_uri;
        
        // Send the audio message
        const result = await this.client.sendMessage(roomId, {
          msgtype: "m.audio",
          url: matrixUrl,
          body: caption || "Audio",
          info: info
        });
        
        console.log('Audio message sent successfully:', result);
        return result;
      } catch (error) {
        console.error('Failed to upload and send audio:', error);
        throw error;
      }
    },
    
    getExtension(mimeType) {
      const extensions = {
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/mp4': 'm4a',
        'audio/aac': 'aac',
        'audio/ogg': 'ogg',
        'audio/wav': 'wav',
        'audio/webm': 'webm',
        'audio/flac': 'flac'
      };
      
      return extensions[mimeType] || 'bin';
    },

    async sendAudio(roomId, audioBuffer, filename, caption = null) {
      try {
        const mxcUri = await uploadFile(this.client, audioBuffer, "audio/mpeg", filename);
        
        const content = {
          msgtype: "m.audio",
          body: filename || "Audio",
          url: mxcUri,
          info: {
            mimetype: "audio/mpeg",
          }
        };
        
        if (caption) {
          content.body = caption;
          content.caption = caption;
        }
        
        await this.client.sendMessage(roomId, content);
        return true;
      } catch (error) {
        console.error("Error sending audio:", error);
        return false;
      }
    },
    
    async sendFile(roomId, fileBuffer, filename, mimetype) {
      try {
        const mxcUri = await uploadFile(this.client, fileBuffer, mimetype, filename);
        
        await this.client.sendMessage(roomId, {
          msgtype: "m.file",
          body: filename || "File",
          url: mxcUri,
          info: {
            mimetype: mimetype,
            size: fileBuffer.length
          }
        });
        return true;
      } catch (error) {
        console.error("Error sending file:", error);
        return false;
      }
    },
    
    
    async createPoll(roomId, question, options = [], timeout = null) {
      try {
        // Using Matrix Polls MSC: https://github.com/matrix-org/matrix-spec-proposals/pull/3381
        const pollEventContent = {
          msgtype: "m.poll.start",
          body: question,
          "org.matrix.msc3381.poll.start": {
            question: { text: question },
            kind: "org.matrix.msc3381.poll.disclosed",
            max_selections: 1,
            answers: options.map((option, index) => ({
              id: `option_${index}`,
              text: option
            }))
          }
        };
        
        const eventId = await this.client.sendMessage(roomId, pollEventContent);
        
        // close poll automatically after timeout
        if (timeout) {
          setTimeout(async () => {
            await this.closePoll(roomId, eventId);
          }, timeout);
        }
        
        return eventId;
      } catch (error) {
        console.error("Error creating poll:", error);
        return null;
      }
    },
    
    async closePoll(roomId, pollEventId) {
      try {
        await this.client.sendEvent(roomId, "m.poll.end", {
          "m.relates_to": {
            rel_type: "m.reference",
            event_id: pollEventId
          },
          "org.matrix.msc3381.poll.end": {}
        });
        return true;
      } catch (error) {
        console.error("Error closing poll:", error);
        return false;
      }
    },
    
    // we dont need to use this function as there is already inbuit bots there
    async kickUser(roomId, userId, reason = "") {
      try {
        await this.client.kickUser(userId, roomId, reason);
        return true;
      } catch (error) {
        console.error(`Error kicking user ${userId}:`, error);
        return false;
      }
    },
    
    async banUser(roomId, userId, reason = "") {
      try {
        await this.client.banUser(userId, roomId, reason);
        return true;
      } catch (error) {
        console.error(`Error banning user ${userId}:`, error);
        return false;
      }
    },
    
    async unbanUser(roomId, userId) {
      try {
        await this.client.unbanUser(userId, roomId);
        return true;
      } catch (error) {
        console.error(`Error unbanning user ${userId}:`, error);
        return false;
      }
    },
    
    async muteUser(roomId, userId, mute = true) {
      try {
        
        const powerLevels = await this.client.getRoomStateEvent(roomId, "m.room.power_levels", "");
        
        const events = {...(powerLevels.events || {})};
        

        if (!powerLevels.events_default) {
          powerLevels.events_default = 0;
        }
        
        
        const users = {...(powerLevels.users || {})};
        
        if (mute) {
          
          users[userId] = -1;
        } else {
          
          if (users[userId] === -1) {
            delete users[userId]; 
          }
        }
        

        powerLevels.users = users;
        
        
        await this.client.sendStateEvent(roomId, "m.room.power_levels", "", powerLevels);
        return true;
      } catch (error) {
        console.error(`Error ${mute ? 'muting' : 'unmuting'} user ${userId}:`, error);
        return false;
      }
    },
    
    async unmuteUser(roomId, userId) {
      return this.muteUser(roomId, userId, false);
    },
    
    async deleteMessage(roomId, eventId, reason = "") {
      try {
        await this.client.redactEvent(roomId, eventId, reason);
        return true;
      } catch (error) {
        console.error("Error deleting message:", error);
        return false;
      }
    },
    
    async pinMessage(roomId, eventId) {
      try {
        
        let pinnedEvents = [];
        try {
          const pinnedState = await this.client.getRoomStateEvent(roomId, "m.room.pinned_events", "");
          pinnedEvents = pinnedState.pinned || [];
        } catch (e) {
        
        }
        
        
        if (!pinnedEvents.includes(eventId)) {
          pinnedEvents.push(eventId);
          
          
          await this.client.sendStateEvent(roomId, "m.room.pinned_events", "", {
            pinned: pinnedEvents
          });
        }
        
        return true;
      } catch (error) {
        console.error("Error pinning message:", error);
        return false;
      }
    },
    
    async unpinMessage(roomId, eventId) {
      try {

        let pinnedEvents = [];
        try {
          const pinnedState = await this.client.getRoomStateEvent(roomId, "m.room.pinned_events", "");
          pinnedEvents = pinnedState.pinned || [];
        } catch (e) {
        
          return true; 
        }
    
        const index = pinnedEvents.indexOf(eventId);
        if (index !== -1) {
          pinnedEvents.splice(index, 1);
          
          
          await this.client.sendStateEvent(roomId, "m.room.pinned_events", "", {
            pinned: pinnedEvents
          });
        }
        
        return true;
      } catch (error) {
        console.error("Error unpinning message:", error);
        return false;
      }
    },
    

    async addReaction(roomId, eventId, reaction) {
      try {
        await this.client.sendEvent(roomId, "m.reaction", {
          "m.relates_to": {
            rel_type: "m.annotation",
            event_id: eventId,
            key: reaction
          }
        });
        return true;
      } catch (error) {
        console.error("Error adding reaction:", error);
        return false;
      }
    },
    
    
    async setRoomName(roomId, name) {
      try {
        await this.client.sendStateEvent(roomId, "m.room.name", "", { name });
        return true;
      } catch (error) {
        console.error("Error setting room name:", error);
        return false;
      }
    },
    
    async setRoomTopic(roomId, topic) {
      try {
        await this.client.sendStateEvent(roomId, "m.room.topic", "", { topic });
        return true;
      } catch (error) {
        console.error("Error setting room topic:", error);
        return false;
      }
    },
    
    async setRoomAvatar(roomId, imageBuffer, filename = "avatar.jpg") {
      try {
        const mxcUri = await uploadFile(this.client, imageBuffer, "image/jpeg", filename);
        await this.client.sendStateEvent(roomId, "m.room.avatar", "", { url: mxcUri });
        return true;
      } catch (error) {
        console.error("Error setting room avatar:", error);
        return false;
      }
    },


    
    async searchMessages(roomId, searchTerm, limit = 50) {
      try {
        const searchParams = {
          search_term: searchTerm,
          keys: ["content.body"],
          filter: {
            limit: limit,
            rooms: [roomId]
          }
        };
        
        const searchResults = await this.client.searchRoomEvents(searchParams);
        return searchResults.results || [];
      } catch (error) {
        console.error("Error searching messages:", error);
        return [];
      }
    },
    
    async getRoomHistory(roomId, limit = 50, from = null) {
      try {
        const timelineEvents = await this.client.getEventTimeline(roomId, from, limit);
        return timelineEvents.events || [];
      } catch (error) {
        console.error("Error fetching room history:", error);
        return [];
      }
    },
    
    // User and member management
    async getRoomMembers(roomId) {
      try {
        const members = await this.client.getJoinedRoomMembers(roomId);
        return members.joined || {};
      } catch (error) {
        console.error("Error getting room members:", error);
        return {};
      }
    },
    
    async inviteUser(roomId, userId) {
      try {
        await this.client.inviteUser(userId, roomId);
        return true;
      } catch (error) {
        console.error(`Error inviting user ${userId}:`, error);
        return false;
      }
    },
    
    async setUserPowerLevel(roomId, userId, powerLevel) {
      try {
        const powerLevels = await this.client.getRoomStateEvent(roomId, "m.room.power_levels", "");
        
        
        const updatedPowerLevels = { ...powerLevels };
        
        
        if (!updatedPowerLevels.users) {
          updatedPowerLevels.users = {};
        }
        
        
        updatedPowerLevels.users[userId] = powerLevel;
        
    
        await this.client.sendStateEvent(roomId, "m.room.power_levels", "", updatedPowerLevels);
        
        
        const cacheKey = `${roomId}:${userId}`;
        let role = 0;
        if (powerLevel >= 100) {
          role = 2; // Admin
        } else if (powerLevel >= 50) {
          role = 1; // Moderator
        }
        this.roleCache.set(cacheKey, role);
        
        return true;
      } catch (error) {
        console.error(`Error setting power level for user ${userId}:`, error);
        return false;
      }
    },
    
    async getDirectMessageRoom(userId) {
      try {
    
        const accountData = await this.client.getAccountDataEvent("m.direct");
        
        if (accountData && accountData[userId]) {
          
          for (const roomId of accountData[userId]) {
            try {
              const joinedMembers = await this.client.getJoinedRoomMembers(roomId);
              const memberCount = Object.keys(joinedMembers.joined || {}).length;
              
              // If it's just the bot and the target user, return this room
              if (memberCount === 2 && joinedMembers.joined[userId]) {
                return roomId;
              }
            } catch (e) {
              // Skip rooms we can't access
              continue;
            }
          }
        }
        
        // Create a new DM room if none exists
        const roomId = await this.client.createRoom({
          preset: "private_chat",
          invite: [userId],
          is_direct: true
        });
        
        // Update account data to mark this as a DM room
        const updatedAccountData = { ...(accountData || {}) };
        if (!updatedAccountData[userId]) {
          updatedAccountData[userId] = [];
        }
        updatedAccountData[userId].push(roomId);
        
        await this.client.setAccountData("m.direct", updatedAccountData);
        
        return roomId;
      } catch (error) {
        console.error(`Error creating/finding DM room with ${userId}:`, error);
        throw error;
      }
    },
    
    // Room encryption
    async enableEncryption(roomId) {
      try {
        await this.client.sendStateEvent(roomId, "m.room.encryption", "", {
          algorithm: "m.megolm.v1.aes-sha2"
        });
        return true;
      } catch (error) {
        console.error("Error enabling encryption:", error);
        return false;
      }
    },
    
    // Advanced message formatting
    async sendFormattedMessage(roomId, plainText, htmlFormatted) {
      try {
        await this.client.sendMessage(roomId, {
          msgtype: "m.text",
          body: plainText,
          format: "org.matrix.custom.html",
          formatted_body: htmlFormatted
        });
        return true;
      } catch (error) {
        console.error("Error sending formatted message:", error);
        return false;
      }
    },
    
    async sendNotice(roomId, text) {
      try {
        await this.client.sendMessage(roomId, {
          msgtype: "m.notice",
          body: text
        });
        return true;
      } catch (error) {
        console.error("Error sending notice:", error);
        return false;
      }
    },
    
    // Message threading
    async sendThreadReply(roomId, threadRootEventId, body) {
      try {
        await this.client.sendMessage(roomId, {
          msgtype: "m.text",
          body: body,
          "m.relates_to": {
            rel_type: "m.thread",
            event_id: threadRootEventId
          }
        });
        return true;
      } catch (error) {
        console.error("Error sending thread reply:", error);
        return false;
      }
    },
    
    async getThreadMessages(roomId, threadRootEventId) {
      try {
        const searchParams = {
          filter: {
            limit: 100,
            rooms: [roomId],
            "m.relates_to": {
              rel_type: "m.thread",
              event_id: threadRootEventId
            }
          }
        };
        
        const searchResults = await this.client.searchRoomEvents(searchParams);
        return searchResults.results || [];
      } catch (error) {
        console.error("Error fetching thread messages:", error);
        return [];
      }
    },
    
    // Room directory functions
    async setRoomVisibility(roomId, isPublic) {
      try {
        await this.client.setRoomDirectoryVisibility(roomId, isPublic ? "public" : "private");
        return true;
      } catch (error) {
        console.error("Error setting room visibility:", error);
        return false;
      }
    },
    
    async searchPublicRooms(searchTerm = "", limit = 50) {
      try {
        const options = { limit };
        if (searchTerm) {
          options.filter = { generic_search_term: searchTerm };
        }
        
        const publicRooms = await this.client.getPublicRooms(options);
        return publicRooms.chunk || [];
      } catch (error) {
        console.error("Error searching public rooms:", error);
        return [];
      }
    },
    
    // Room membership management
    async leaveRoom(roomId) {
      try {
        await this.client.leaveRoom(roomId);
        return true;
      } catch (error) {
        console.error(`Error leaving room ${roomId}:`, error);
        return false;
      }
    },
    
    async forgetRoom(roomId) {
      try {
        // Must leave room before forgetting it
        try {
          await this.client.leaveRoom(roomId);
        } catch (e) {
          // Already left or not joined, continue
        }
        
        await this.client.forgetRoom(roomId);
        return true;
      } catch (error) {
        console.error(`Error forgetting room ${roomId}:`, error);
        return false;
      }
    },
    

    async createSpace(name, topic = "", isPublic = false) {
        try {
          const spaceId = await this.client.createRoom({
            name,
            topic,
            visibility: isPublic ? "public" : "private",
            creation_content: {
              "type": "m.space"
            }
          });
          return spaceId;
        } catch (error) {
          console.error("Error creating space:", error);
          throw error;
        }
      },
      
      async addRoomToSpace(spaceId, roomId, suggested = false) {
        try {
          await this.client.sendStateEvent(spaceId, "m.space.child", roomId, {
            via: [this.client.getDomain()],
            suggested
          });
          return true;
        } catch (error) {
          console.error(`Error adding room ${roomId} to space ${spaceId}:`, error);
          return false;
        }
      },
      
      async removeRoomFromSpace(spaceId, roomId) {
        try {
          await this.client.sendStateEvent(spaceId, "m.space.child", roomId, {});
          return true;
        } catch (error) {
          console.error(`Error removing room ${roomId} from space ${spaceId}:`, error);
          return false;
        }
      },
      
      async getSpaceRooms(spaceId) {
        try {
          const childEvents = await this.client.getRoomStateEvents(spaceId, "m.space.child");
          return childEvents.map(event => event.state_key);
        } catch (error) {
          console.error(`Error getting rooms in space ${spaceId}:`, error);
          return [];
        }
      },
      
      // User profile functions
      async setDisplayName(displayName) {
        try {
          await this.client.setDisplayName(displayName);
          return true;
        } catch (error) {
          console.error("Error setting display name:", error);
          return false;
        }
      },
      
      async setAvatarUrl(imageBuffer, filename = "avatar.jpg") {
        try {
          const mxcUri = await uploadFile(this.client, imageBuffer, "image/jpeg", filename);
          await this.client.setAvatarUrl(mxcUri);
          return true;
        } catch (error) {
          console.error("Error setting avatar:", error);
          return false;
        }
      },
      
      async getUserProfile(userId) {
        try {
          return await this.client.getUserProfile(userId);
        } catch (error) {
          console.error(`Error getting profile for user ${userId}:`, error);
          return null;
        }
      },
      
      // Presence and status
      async setPresence(presence = "online", statusMessage = "") {
        try {
          await this.client.setPresence({
            presence,
            status_msg: statusMessage
          });
          return true;
        } catch (error) {
          console.error("Error setting presence:", error);
          return false;
        }
      },
      
      async getPresence(userId) {
        try {
          return await this.client.getPresence(userId);
        } catch (error) {
          console.error(`Error getting presence for user ${userId}:`, error);
          return null;
        }
      },
      
      // Advanced room settings
      async setRoomJoinRules(roomId, joinRule = "invite") {
        try {
          // Valid join rules: public, knock, invite, private
          await this.client.sendStateEvent(roomId, "m.room.join_rules", "", {
            join_rule: joinRule
          });
          return true;
        } catch (error) {
          console.error(`Error setting join rules for room ${roomId}:`, error);
          return false;
        }
      },
      
      async setRoomGuestAccess(roomId, allowGuests = false) {
        try {
          await this.client.sendStateEvent(roomId, "m.room.guest_access", "", {
            guest_access: allowGuests ? "can_join" : "forbidden"
          });
          return true;
        } catch (error) {
          console.error(`Error setting guest access for room ${roomId}:`, error);
          return false;
        }
      },
      
      async setRoomHistoryVisibility(roomId, visibility = "shared") {
        try {
          // Valid history visibility: world_readable, shared, invited, joined
          await this.client.sendStateEvent(roomId, "m.room.history_visibility", "", {
            history_visibility: visibility
          });
          return true;
        } catch (error) {
          console.error(`Error setting history visibility for room ${roomId}:`, error);
          return false;
        }
      },
      
      // Message editing and deletion
      async editMessage(roomId, eventId, newBody) {
        try {
          // Get the original event to reference its type
          const event = await this.client.getEvent(roomId, eventId);
          const originalBody = event.content.body;
          const msgtype = event.content.msgtype || "m.text";
          
          await this.client.sendMessage(roomId, {
            msgtype,
            body: `* ${newBody}`,
            "m.new_content": {
              msgtype,
              body: newBody
            },
            "m.relates_to": {
              rel_type: "m.replace",
              event_id: eventId
            }
          });
          return true;
        } catch (error) {
          console.error("Error editing message:", error);
          return false;
        }
      },
      
      // Push notifications
      async setPushRules(roomId, actions = ["notify"], pattern = null) {
        try {
          const ruleId = `room_${roomId}`;
          const rule = {
            actions,
            conditions: [
              {
                kind: "event_match",
                key: "room_id",
                pattern: roomId
              }
            ],
            default: false,
            enabled: true
          };
          
          // If pattern is provided, add a message content match condition
          if (pattern) {
            rule.conditions.push({
              kind: "event_match",
              key: "content.body",
              pattern: pattern
            });
          }
          
          await this.client.setPushRule("global", "override", ruleId, rule);
          return true;
        } catch (error) {
          console.error("Error setting push rule:", error);
          return false;
        }
      },
      
      async removePushRule(roomId) {
        try {
          const ruleId = `room_${roomId}`;
          await this.client.deletePushRule("global", "override", ruleId);
          return true;
        } catch (error) {
          console.error("Error removing push rule:", error);
          return false;
        }
      },
      
      // User and room tagging
      async tagRoom(roomId, tag = "m.favourite", order = 0.5) {
        try {
          await this.client.setRoomTag(roomId, tag, { order });
          return true;
        } catch (error) {
          console.error(`Error tagging room ${roomId}:`, error);
          return false;
        }
      },
      
      async untagRoom(roomId, tag = "m.favourite") {
        try {
          await this.client.deleteRoomTag(roomId, tag);
          return true;
        } catch (error) {
          console.error(`Error untagging room ${roomId}:`, error);
          return false;
        }
      },
      
      // Typing indicators with automated management
      startTypingIndicator(roomId, interval = 20000) {
        // Clear any existing interval
        if (this._typingIntervals && this._typingIntervals[roomId]) {
          clearInterval(this._typingIntervals[roomId]);
        }
        
        // Initialize typing intervals storage if needed
        if (!this._typingIntervals) {
          this._typingIntervals = {};
        }
        
        // Send initial typing notification
        this.sendTypingNotification(roomId, true, interval + 5000);
        
        // Set up interval to refresh typing notification
        this._typingIntervals[roomId] = setInterval(() => {
          this.sendTypingNotification(roomId, true, interval + 5000);
        }, interval);
      },
      
      stopTypingIndicator(roomId) {
        // Clear the interval if it exists
        if (this._typingIntervals && this._typingIntervals[roomId]) {
          clearInterval(this._typingIntervals[roomId]);
          delete this._typingIntervals[roomId];
          
          // Send notification that typing has stopped
          this.sendTypingNotification(roomId, false);
        }
      },
      
      // Key verification
      async startKeyVerification(userId, deviceId) {
        try {
          const verificationRequest = await this.client.requestVerification(userId, [deviceId]);
          return verificationRequest;
        } catch (error) {
          console.error(`Error starting key verification with ${userId}:`, error);
          return null;
        }
      },
      
      // Advanced room state management
      async getRoomState(roomId) {
        try {
          return await this.client.getRoomState(roomId);
        } catch (error) {
          console.error(`Error getting room state for ${roomId}:`, error);
          return [];
        }
      },
      
      // Group/community management (deprecated in favor of spaces but still used)
      async createGroup(localpart, name, avatarUrl = null) {
        try {
          await this.client.createGroup({
            localpart,
            profile: {
              name,
              avatar_url: avatarUrl
            }
          });
          return `+${localpart}:${this.client.getDomain()}`;
        } catch (error) {
          console.error("Error creating group:", error);
          return null;
        }
      },
      
      // Cross-signing management
      async bootstrapCrossSigning() {
        try {
          await this.client.bootstrapCrossSigning();
          return true;
        } catch (error) {
          console.error("Error bootstrapping cross-signing:", error);
          return false;
        }
      },
      
      // Room widgets
      async addRoomWidget(roomId, widgetId, url, name, data = {}) {
        try {
          await this.client.sendStateEvent(roomId, "im.vector.modular.widgets", widgetId, {
            type: "m.custom",
            url: url,
            name: name,
            data: data
          });
          return true;
        } catch (error) {
          console.error(`Error adding widget to room ${roomId}:`, error);
          return false;
        }
      },
      
      async removeRoomWidget(roomId, widgetId) {
        try {
          await this.client.sendStateEvent(roomId, "im.vector.modular.widgets", widgetId, {});
          return true;
        } catch (error) {
          console.error(`Error removing widget from room ${roomId}:`, error);
          return false;
        }
      },


    // Typing notifications
    async sendTypingNotification(roomId, isTyping = true, timeout = 30000) {
      try {
        await this.client.sendTyping(roomId, isTyping, isTyping ? timeout : undefined);
        return true;
      } catch (error) {
        console.error("Error sending typing notification:", error);
        return false;
      }
    },
    
    // Read receipts
    async sendReadReceipt(roomId, eventId) {
      try {
        await this.client.sendReadReceipt(roomId, eventId);
        return true;
      } catch (error) {
        console.error("Error sending read receipt:", error);
        return false;
      }
    }
}

  
export const MatrixBot = {
    create(client, helpers, extensions) {
      return Object.assign(Object.create(helpers), extensions, { client });
    } }