import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase-config";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ref, push, onValue, set, serverTimestamp, remove, update } from "firebase/database";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";

function Chat() {
  // Khai báo các biến trạng thái
  const [tinNhan, setTinNhan] = useState([]);
  const [noiDung, setNoiDung] = useState("");
  const [nguoiDung, setNguoiDung] = useState(null);
  const [emailNguoiNhan, setEmailNguoiNhan] = useState("");
  const [danhSachHoiThoai, setDanhSachHoiThoai] = useState([]);
  const [file, setFile] = useState(null);
  const [hienThiEmoji, setHienThiEmoji] = useState(false);

  const navigate = useNavigate();

  // Kiểm tra trạng thái đăng nhập của người dùng
  useEffect(() => {
    const huyDangNhap = onAuthStateChanged(auth, (nguoiDungHienTai) => {
      if (nguoiDungHienTai) {
        setNguoiDung(nguoiDungHienTai);
      } else {
        navigate("/");
      }
    });

    return () => huyDangNhap();
  }, [navigate]);

  // Chuẩn hóa Email để tránh lỗi Firebase
  const chuanHoaEmail  = (email) => email.replace(/[@.]/g, "_");

  // Lấy danh sách hội thoại của người dùng
  useEffect(() => {
    if (nguoiDung) {
      const userChatListRef = ref(db, `chat_list/${chuanHoaEmail(nguoiDung.email)}`);
      onValue(userChatListRef, (snapshot) => {
        const chatList = snapshot.val();
        setDanhSachHoiThoai(chatList ? Object.values(chatList) : []);
      });
    }
  }, [nguoiDung]);

  // Lấy danh sách tin nhắn giữa người dùng và người nhận
  useEffect(() => {
    if (nguoiDung && emailNguoiNhan) {
      const refPath = `messages/${chuanHoaEmail(nguoiDung.email)}_${chuanHoaEmail(emailNguoiNhan)}`;
      const tinNhanRef = ref(db, refPath);

      onValue(tinNhanRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const tinNhanList = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
          }));
          setTinNhan(tinNhanList);
        } else {
          setTinNhan([]);
        }
      });
    }
  }, [nguoiDung, emailNguoiNhan]);

  // Lưu Email vào danh sách hội thoại
  const luuEmailVaoDanhSach = (email1, email2) => {
    const chatListRef1 = ref(db, `chat_list/${chuanHoaEmail(email1)}`);
    const chatListRef2 = ref(db, `chat_list/${chuanHoaEmail(email2)}`);

    onValue(chatListRef1, (snapshot) => {
      let chatList = snapshot.val() || [];
      if (!chatList.includes(email2)) {
        chatList.push(email2);
        set(chatListRef1, chatList);
      }
    }, { onlyOnce: true });

    onValue(chatListRef2, (snapshot) => {
      let chatList = snapshot.val() || [];
      if (!chatList.includes(email1)) {
        chatList.push(email1);
        set(chatListRef2, chatList);
      }
    }, { onlyOnce: true });
  };

  // Gửi tin nhắn hoặc file
  const guiTinNhan = (fileUrl = null, fileName = null, fileType = null) => {
    if ((!noiDung.trim() && !fileUrl) || !emailNguoiNhan.trim()) return;

    const messageData = {
      text: noiDung,
      fileUrl,
      fileName,
      fileType,
      user: nguoiDung.email,
      timestamp: serverTimestamp(),
    };

    // Lưu tin nhắn vào Firebase
    const refPath = `messages/${chuanHoaEmail(nguoiDung.email)}_${chuanHoaEmail(emailNguoiNhan)}`;
    push(ref(db, refPath), messageData);
    const refPathReverse = `messages/${chuanHoaEmail(emailNguoiNhan)}_${chuanHoaEmail(nguoiDung.email)}`;
    push(ref(db, refPathReverse), messageData);

    // Cập nhật danh sách hội thoại
    luuEmailVaoDanhSach(nguoiDung.email, emailNguoiNhan);

    setNoiDung("");
    setFile(null);
  };

  // Xóa tin nhắn
  const xoaTinNhan = (messageId, emailNguoiNhan) => {
    if (!emailNguoiNhan) return;
  
    const currentUserEmail = chuanHoaEmail(nguoiDung.email);
    const otherUserEmail = chuanHoaEmail(emailNguoiNhan);
    const conversationId1 = `${currentUserEmail}_${otherUserEmail}`;
    const conversationId2 = `${otherUserEmail}_${currentUserEmail}`;
  
    const updates = {};
    updates[`messages/${conversationId1}/${messageId}`] = null;
    updates[`messages/${conversationId2}/${messageId}`] = null;
  
    update(ref(db), updates);
  };

  // Xóa cuộc hội thoại  
  const xoaCuocHoiThoai = (email) => {
    const currentUserEmail = chuanHoaEmail(nguoiDung.email);
    const otherUserEmail = chuanHoaEmail(email);
  
    const refPath = `messages/${currentUserEmail}_${otherUserEmail}`;
    remove(ref(db, refPath));
  
    const chatListRef = ref(db, `chat_list/${currentUserEmail}`);
    onValue(chatListRef, (snapshot) => {
      let chatList = snapshot.val() || [];
      chatList = chatList.filter((e) => e !== email);
      set(chatListRef, chatList);
    }, { onlyOnce: true });
  
    if (emailNguoiNhan === email) {
      setEmailNguoiNhan("");
      setTinNhan([]);
    }
  }; 

  // Tải file lên Cloudinary
  const uploadFileToCloudinary = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "chatapp-for-saas");
    formData.append("cloud_name", "dw88a5fct");

    try {
      const response = await axios.post("https://api.cloudinary.com/v1_1/dw88a5fct/upload", formData);
      guiTinNhan(response.data.secure_url, file.name, file.type);
    } catch (error) {
      console.error("Lỗi tải file lên Cloudinary:", error);
    }
  };

  // Gửi Emoji
  const chonEmoji = (emojiObject) => {
    setNoiDung((prev) => prev + emojiObject.emoji);
  };

  if (!nguoiDung) {
    return <p>Đang tải...</p>;
  }

  // Đăng xuất
  const dangXuat = async () => {
    await signOut(auth);
    navigate("/");
  };


  return (
    <div style={styles.container}>
      <h1>Chats - Trò chuyện trực tuyến</h1>
      <h2>👋 Xin chào, {nguoiDung.displayName || nguoiDung.email}!</h2>
      <button onClick={dangXuat} style={styles.button}>Đăng xuất</button>

      <div style={styles.mainContainer}>
        <div style={styles.leftPanel}>
          <h3>Danh sách hội thoại:</h3>
          <input
            type="email"
            placeholder="Nhập Email để bắt đầu trò chuyện"
            value={emailNguoiNhan}
            onChange={(e) => setEmailNguoiNhan(e.target.value)}
            style={styles.inputEmail}
          />
          <ul>
            {danhSachHoiThoai.map((email) => (
              <li key={email} onClick={() => setEmailNguoiNhan(email)} style={styles.emailItem}>
                {email.replace(/_/g, "@")}
                <button onClick={() => xoaCuocHoiThoai(email)}>🗑 Xóa cuộc hội thoại</button>
              </li>
            ))}
          </ul>
        </div>

        <div style={styles.rightPanel}>
          {!emailNguoiNhan ? (
            <p style={styles.noChatSelected}>
                <h1>Chào mừng đến với Chats!</h1>
                <p>Mọi người đều có câu chuyện, còn của bạn là gì?</p>
                <p>Mỗi tin nhắn là một câu chuyện – kể câu chuyện của bạn ngay bây giờ!</p>
            </p>
          ) : (
            <>
              <h3>Đoạn chat với: {emailNguoiNhan.replace(/_/g, "@")}</h3>
              <div style={styles.messagesContainer}>
                {tinNhan.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      ...styles.messageContainer,
                      backgroundColor: msg.user === nguoiDung.email ? "#D1F0FF" : "#E0E0E0",
                      alignSelf: msg.user === nguoiDung.email ? "flex-end" : "flex-start",
                    }}
                  >
                    <strong>{msg.user}:</strong>
                    {msg.text && <p>{msg.text}</p>}
                    {msg.fileUrl && (
                      <>
                        {msg.fileType.startsWith("image/") ? (
                          <div>
                            <img src={msg.fileUrl} alt={msg.fileName} style={{ width: "150px" }} />
                            <p>📷 {msg.fileName} - <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">Tải về</a></p>
                          </div>
                        ) : msg.fileType.startsWith("video/") ? (
                          <div>
                            <video controls width="250">
                              <source src={msg.fileUrl} type={msg.fileType} />
                            </video>
                            <p>🎥 {msg.fileName} - <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">Tải về</a></p>
                          </div>
                        ) : (
                          <p>📄 {msg.fileName} - <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">Tải về</a></p>
                        )}
                      </>
                    )}
                    <div style={styles.timestamp}>
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : "Đang gửi..."}
                    </div>
                    {msg.user === nguoiDung.email && (
                        <button onClick={() => xoaTinNhan(msg.id, emailNguoiNhan)} style={styles.deleteButton}>🗑 Xóa</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={styles.inputContainer}>
                <textarea
                  placeholder="Nhập tin nhắn"
                  value={noiDung}
                  onChange={(e) => setNoiDung(e.target.value)}
                  style={styles.textarea}
                />
                <button onClick={() => setHienThiEmoji(!hienThiEmoji)} style={styles.emojiButton}>😊</button>
                {hienThiEmoji && <EmojiPicker onEmojiClick={chonEmoji} />}
                <button onClick={() => guiTinNhan()} style={styles.sendButton}>Gửi Tin nhắn</button>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                <button onClick={uploadFileToCloudinary} style={styles.sendFileButton}>Gửi File</button>
                
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
    container: { padding: "20px", fontFamily: "Arial, sans-serif" },
    mainContainer: { display: "flex", justifyContent: "space-between", marginTop: "20px", height: "500px" },
    leftPanel: {  width: "30%",  minWidth: "250px",  maxWidth: "300px",  border: "1px solid #ccc",  padding: "10px",  display: "flex",  flexDirection: "column", overflowY: "auto" },
    rightPanel: {  flexGrow: 1,  border: "1px solid #ccc",  padding: "10px",  display: "flex",  flexDirection: "column",  overflow: "hidden" },
    noChatSelected: {  textAlign: "center",  color: "#777",  fontSize: "18px",  display: "flex",  flexDirection: "column",  justifyContent: "center",  alignItems: "center",  height: "100%" },
    messagesContainer: { flexGrow: 1, height: "600px", overflowY: "auto", border: "1px solid #ccc", marginTop: "10px", marginBottom: "10px", display: "flex", flexDirection: "column" },
    messageContainer: { margin: "10px 10px", padding: "10px 10px", borderRadius: "10px", maxWidth: "75%", },
    timestamp: { fontSize: "12px", color: "#999" },
    inputContainer: { display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "10px" },    
    textarea: { flexGrow: 1, padding: "8px", height: "20px", borderRadius: "5px", border: "1px solid #ccc" },
    emojiButton: { padding: "5px", fontSize: "20px", background: "none", border: "none", cursor: "pointer", },    
    sendButton: { padding: "10px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
    sendFileButton: { padding: "10px", backgroundColor: "#FF9800", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },    
  };
  
export default Chat;
