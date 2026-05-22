/**
 * Sasl - Advanced Group Chat
 * Mesh-enabled group messaging with invites, media sharing, and offline support
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Send, Users, Plus, Image, Smile, UserPlus, LogOut,
  Loader2, MessageCircle, WifiOff, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  creator: { username: string };
  members: any[];
  members_count: number;
  is_mesh: boolean;
  is_private: boolean;
  last_message?: any;
  created_at: string;
}

interface Message {
  id: string;
  sender: { username: string; avatar_url?: string };
  text: string;
  image?: string;
  is_system_message: boolean;
  created_at: string;
}

export default function GroupChat() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isMeshGroup, setIsMeshGroup] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(() => {
      if (activeGroup) fetchMessages(activeGroup, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get('/groupchat/groups/');
      setGroups(res.data.results || res.data || []);
    } catch (err) {
      console.log('Groups fetch failed - may be offline');
    }
  }, []);

  const fetchMessages = async (groupId: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/groupchat/groups/${groupId}/messages/`);
      setMessages(res.data.results || res.data || []);
    } catch (err) {
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Enter a group name');
      return;
    }
    try {
      const res = await api.post('/groupchat/groups/', {
        name: groupName,
        is_mesh: isMeshGroup,
        is_private: isPrivate,
      });
      toast.success(`Group "${groupName}" created!`);
      setShowCreate(false);
      setGroupName('');
      setIsMeshGroup(true);
      setIsPrivate(false);
      await fetchGroups();
      setActiveGroup(res.data.id);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create group';
      toast.error(msg);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;
    if (!activeGroup) return;
    setSending(true);

    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append('text', input);
        formData.append('image', selectedImage);
        await api.post(`/groupchat/groups/${activeGroup}/send_message/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSelectedImage(null);
        setImagePreview(null);
      } else {
        await api.post(`/groupchat/groups/${activeGroup}/send_message/`, { text: input });
      }
      setInput('');
      await fetchMessages(activeGroup, true);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to send message';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteUsername.trim() || !activeGroup) return;
    try {
      await api.post(`/groupchat/groups/${activeGroup}/add_member/`, {
        username: inviteUsername,
      });
      toast.success(`${inviteUsername} added to group!`);
      setInviteUsername('');
      setShowInvite(false);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      await api.post(`/groupchat/groups/${groupId}/leave/`);
      toast.success('Left the group');
      if (activeGroup === groupId) setActiveGroup(null);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to leave group');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeGroupData = groups.find(g => g.id === activeGroup);

  return (
    <div className="flex h-[calc(100vh-120px)] max-w-5xl mx-auto glass rounded-2xl overflow-hidden shadow-xl m-4">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle size={20} /> Groups
          </h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn-primary w-full mt-3 text-sm flex items-center gap-1 justify-center"
          >
            <Plus size={14} /> New Group
          </button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-4 space-y-2">
                <input
                  className="input-field text-sm"
                  placeholder="Group name..."
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createGroup()}
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={isMeshGroup} onChange={e => setIsMeshGroup(e.target.checked)} className="rounded" />
                    <WifiOff size={12} /> Mesh
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="rounded" />
                    Private
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={createGroup} className="btn-primary flex-1 text-xs py-1.5">Create</button>
                  <button onClick={() => setShowCreate(false)} className="btn-ghost text-xs py-1.5">Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 && (
            <div className="text-center text-gray-400 p-8">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No groups yet</p>
              <p className="text-xs">Create one to start chatting!</p>
            </div>
          )}
          {groups.map(group => (
            <motion.div
              key={group.id}
              role="button"
              tabIndex={0}
              onClick={() => { setActiveGroup(group.id); fetchMessages(group.id); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveGroup(group.id); fetchMessages(group.id); } }}
              className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                activeGroup === group.id ? 'bg-green-50 dark:bg-green-900/30 border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                    {group.name[0]?.toUpperCase() || 'G'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-1">
                      {group.name}
                      {group.is_mesh && <WifiOff size={10} className="text-purple-500" />}
                    </p>
                    <p className="text-xs text-gray-500">
                      {group.members_count || group.members?.length || 0} members
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); leaveGroup(group.id); }}
                  className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                  title="Leave group"
                >
                  <LogOut size={14} />
                </button>
              </div>
              {group.last_message && (
                <p className="text-xs text-gray-400 mt-1 truncate ml-12">
                  {group.last_message.sender?.username}: {group.last_message.text?.slice(0, 40)}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeGroup && activeGroupData ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                  {activeGroupData.name[0]?.toUpperCase() || 'G'}
                </div>
                <div>
                  <h3 className="font-bold">{activeGroupData.name}</h3>
                  <p className="text-xs text-gray-500">
                    {activeGroupData.members_count || 0} members
                    {activeGroupData.is_mesh && ' · Mesh Enabled'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowInvite(!showInvite)} className="btn-ghost text-sm flex items-center gap-1">
                <UserPlus size={14} /> Invite
              </button>
            </div>

            <AnimatePresence>
              {showInvite && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-3 flex gap-2">
                    <input className="input-field flex-1 text-sm" placeholder="Enter username to invite..." value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && inviteMember()} />
                    <button onClick={inviteMember} className="btn-primary text-sm"><UserPlus size={14} /></button>
                    <button onClick={() => setShowInvite(false)} className="btn-ghost text-sm"><X size={14} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
              {loading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-green-500" size={20} /></div>}
              {messages.length === 0 && !loading && (
                <div className="text-center text-gray-400 py-20">
                  <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Be the first to say something!</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.sender?.username === user?.username;
                const isSystem = msg.is_system_message;
                const showAvatar = idx === 0 || messages[idx - 1]?.sender?.username !== msg.sender?.username;

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center">
                      <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full">{msg.text}</span>
                    </div>
                  );
                }

                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
                    {!isMe && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                        {msg.sender?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    {!isMe && !showAvatar && <div className="w-8 mr-2 flex-shrink-0" />}
                    <div className={`max-w-[70%] ${isMe ? 'order-1' : ''}`}>
                      {showAvatar && !isMe && <p className="text-xs text-gray-500 mb-0.5 ml-1">{msg.sender?.username}</p>}
                     {msg.image && (
  <img 
    src={msg.image.startsWith('http') ? msg.image : `http://localhost:8000${msg.image}`}
    alt="Shared"
    className="max-w-full rounded-xl mb-1 max-h-60 object-cover"
  />
)}
                      {msg.text && (
                        <div className={`px-4 py-2 rounded-2xl text-sm ${
                          isMe ? 'bg-green-500 text-white rounded-br-md' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm'
                        }`}>{msg.text}</div>
                      )}
                      <p className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {imagePreview && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
                <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="p-1 rounded-full bg-red-500 text-white"><X size={14} /></button>
              </div>
            )}

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Image size={18} /></button>
              <input className="input-field flex-1 text-sm" placeholder="Type a message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} />
              <button onClick={sendMessage} disabled={sending || (!input.trim() && !selectedImage)} className="btn-primary p-2 rounded-full disabled:opacity-50">
                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 flex items-center justify-center mx-auto mb-4">
                <Users size={48} className="opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-gray-500 mb-2">Sasl Groups</h3>
              <p className="text-sm">Select a group from the sidebar or create a new one</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 flex items-center gap-1 mx-auto"><Plus size={14} /> Create Your First Group</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}