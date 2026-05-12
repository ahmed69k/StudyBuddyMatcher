import { useState, useEffect, useRef } from "react";

import {
  useQuery,
  useMutation,
  useSubscription,
} from "@apollo/client/react";

import {
  GET_CONVERSATIONS,
  SEND_MESSAGE,
  MESSAGE_SUBSCRIPTION,
  CREATE_CONVERSATION,
} from "./../../graphql/chat";

import {
  FaComments,
  FaTimes,
  FaArrowLeft,
  FaPaperPlane,
} from "react-icons/fa";

import { GET_ALL_USERS } from "../../graphql/user";
import { useAuthUser } from "../../hooks/useAuthUser";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { user } = useAuthUser();
  const userId = user?.id;

  const [selectedConversationId, setSelectedConversationId] =
    useState(null);

  const { data: usersData } = useQuery(GET_ALL_USERS, {
    fetchPolicy: "cache-and-network",
  });

  const users = usersData?.getAllUsers || [];

  const getOtherUser = (convo) => {
    if (!convo?.users || !userId) return null;

    const otherUserId = convo.users.find((id) => id !== userId);
    return users.find((u) => u.id === otherUserId) || null;
  };

  const getConversationName = (convo) => {
    const other = getOtherUser(convo);
    return other?.username || "Unknown user";
  };

  const [message, setMessage] = useState("");

  const [showNewConv, setShowNewConv] = useState(false);
  const [newUserId, setNewUserId] = useState("");

  const messagesEndRef = useRef(null);

  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  const { data, refetch } = useQuery(GET_CONVERSATIONS, {
    fetchPolicy: "cache-and-network",
  });

  const [sendMessage] = useMutation(SEND_MESSAGE);
  const [createConversation] = useMutation(CREATE_CONVERSATION);

  const conversations = data?.getUserConversations || [];

  const selectedConversation =
    conversations.find((c) => c.id === selectedConversationId) || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [selectedConversation?.messages]);

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open]);

  useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: {
      conversationId: selectedConversationId,
    },
    skip: !selectedConversationId,

    onData: async ({ data }) => {
      const newMessage = data.data?.messageSent;
      if (!newMessage) return;

      if (newMessage.senderId !== userId) {
        audioRef.current?.play().catch(() => {});
      }

      await refetch();
    },
  });

  const handleSend = async () => {
    if (!message.trim()) return;

    await sendMessage({
      variables: {
        input: {
          conversationId: selectedConversationId,
          message,
        },
      },
    });

    setMessage("");
    await refetch();
  };

  const handleCreateConversation = async () => {
    if (!newUserId.trim()) return;

    try {
      await createConversation({
        variables: {
          input: {
            addedUser: newUserId,
          },
        },
      });

      setNewUserId("");
      setShowNewConv(false);
      await refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const messages = selectedConversation?.messages
    ? [...selectedConversation.messages].slice().reverse()
    : [];

  return (
    <>
      {/* Floating Bubble */}
      <button
        onClick={() => setOpen(!open)}
        className="
          fixed
          bottom-6
          right-6
          z-50
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-3xl
          border
          border-violet-200/70
          bg-white/70
          text-violet-700
          shadow-[var(--shadow-card)]
          backdrop-blur-xl
          transition-all
          duration-300
          hover:scale-105
          hover:border-violet-300
          hover:shadow-xl
          cursor-pointer
        "
      >
        {open ? <FaTimes size={20} /> : <FaComments size={22} />}
      </button>

      {/* Window */}
      {open && (
        <div
          className="
            fixed
            bottom-24
            right-6
            z-50
            flex
            h-[620px]
            w-[390px]
            flex-col
            overflow-hidden
            rounded-[2rem]
            border
            border-violet-100/70
            bg-white/60
            shadow-[var(--shadow-soft)]
            backdrop-blur-xl
            animate-in
            fade-in
            slide-in-from-bottom-5
            duration-300
          "
        >
          <div className="relative flex items-center justify-between border-b border-violet-100/70 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Messages
              </h2>
              <p className="text-xs text-slate-500">
                Study chats & collaboration
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowNewConv((p) => !p)}
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-2xl
                  bg-violet-100/70
                  text-violet-700
                  transition
                  hover:bg-violet-200
                  cursor-pointer
                "
              >
                +
              </button>

              {selectedConversationId && (
                <button
                  onClick={() =>
                    setSelectedConversationId(null)
                  }
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-2xl
                    bg-violet-100/70
                    text-violet-700
                    transition
                    hover:bg-violet-200
                    cursor-pointer
                  "
                >
                  <FaArrowLeft size={14} />
                </button>
              )}
            </div>
          </div>

          {showNewConv && (
            <div className="p-3 border-b border-violet-100/70">
              <div className="flex gap-2">
                <input
                  value={newUserId}
                  onChange={(e) =>
                    setNewUserId(e.target.value)
                  }
                  placeholder="Enter user ID..."
                  className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                />

                <button
                  onClick={handleCreateConversation}
                  className="rounded-xl bg-violet-600 px-4 text-white cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {!selectedConversationId ? (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-3">
                {conversations.map((convo) => {
                  const other = getOtherUser(convo);

                  return (
                    <button
                      key={convo.id}
                      onClick={() =>
                        setSelectedConversationId(convo.id)
                      }
                      className="
                        w-full
                        rounded-3xl
                        border
                        border-violet-100/70
                        bg-white/70
                        p-4
                        text-left
                        shadow-sm
                        backdrop-blur-sm
                        transition-all
                        hover:-translate-y-0.5
                        hover:border-violet-200
                        hover:shadow-md
                        cursor-pointer
                      "
                    >
                      <div className="flex items-center gap-3">
                        <div className="
                          flex h-12 w-12 items-center justify-center overflow-hidden
                          rounded-2xl bg-gradient-to-br
                          from-violet-500 to-purple-600
                          text-sm font-bold text-white shadow-lg
                        ">
                          {other?.profilePicture ? (
                            <img
                              src={other.profilePicture}
                              alt="avatar"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>
                              {getConversationName(convo)
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {getConversationName(convo)}
                          </p>

                          <p className="text-xs text-slate-500">
                            {convo.messages.length} messages
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-5">
                <div className="space-y-5">
                  {messages.map((msg) => {
                    const isMine =
                      msg.senderId === userId;

                    const formattedTime =
                      new Date(Number(msg.sendDate)).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      );

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMine
                            ? "items-end"
                            : "items-start"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 px-2 text-xs text-slate-500">
                          {!isMine && (
                            <span className="font-semibold text-slate-700">
                              {msg.senderName}
                            </span>
                          )}
                          <span>{formattedTime}</span>
                        </div>

                        <div
                          className={`max-w-[78%] rounded-[1.6rem] px-4 py-3 text-sm ${
                            isMine
                              ? "bg-violet-600 text-white"
                              : "border border-violet-100/70 bg-white/85 text-slate-700"
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="border-t border-violet-100/70 p-4">
                <div className="flex items-center gap-3 rounded-2xl border border-violet-100/80 bg-white/70 p-2">
                  <input
                    value={message}
                    onChange={(e) =>
                      setMessage(e.target.value)
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSend()
                    }
                    placeholder="Send a message..."
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                  />

                  <button
                    onClick={handleSend}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white cursor-pointer"
                  >
                    <FaPaperPlane size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}