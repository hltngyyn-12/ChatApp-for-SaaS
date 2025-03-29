import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase-config";
import { signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { ref, push, onValue, set, serverTimestamp, remove, update } from "firebase/database";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import CryptoJS from "crypto-js";
import "./Chat.css";

function Chat() {
  const [danhSachTinNhan, setDanhSachTinNhan] = useState([]);
  const [noiDungTinNhan, setNoiDungTinNhan] = useState("");
  const [thongTinNguoiDung, setThongTinNguoiDung] = useState(null);
  const [emailNguoiNhan, setEmailNguoiNhan] = useState("");
  const [danhSachCuocTroChuyen, setDanhSachCuocTroChuyen] = useState([]);
  const [tuKhoaTimKiem, setTuKhoaTimKiem] = useState("");
  const [tepTin, setTepTin] = useState(null);
  const [hienThiBieuTuongCamXuc, setHienThiBieuTuongCamXuc] = useState(false);
  const [trangThaiNguoiDung, setTrangThaiNguoiDung] = useState("online");
  const [hienThiMenu, setHienThiMenu] = useState(false);
  const [hienThiTinNhanMoi, setHienThiTinNhanMoi] = useState(false);
  const [hienThiThongTinTaiKhoan, setHienThiThongTinTaiKhoan] = useState(false);
  const [tenHienThiMoi, setTenHienThiMoi] = useState("");
  const [daKhoiTaoTenHienThi, setDaKhoiTaoTenHienThi] = useState(false);
  const [anhDaiDienMoi, setAnhDaiDienMoi] = useState(null);
  const cuoiDanhSachTinNhan = useRef(null);

  const chuyenTrang = (duongDan) => (window.location.href = duongDan);

  const taoKhoaDong = (email1, email2) => {
    const emails = [email1, email2].sort();
    return CryptoJS.SHA256(emails[0] + emails[1]).toString();
  };

  const maHoaTinNhan = (noiDung, emailNguoiGui, emailNguoiNhan) => {
    const secretKey = taoKhoaDong(emailNguoiGui, emailNguoiNhan);
    return noiDung ? CryptoJS.AES.encrypt(noiDung, secretKey).toString() : "";
  };

  const giaiMaTinNhan = (noiDungMaHoa, emailNguoiGui, emailNguoiNhan) => {
    if (!noiDungMaHoa) return "";
    try {
      const secretKey = taoKhoaDong(emailNguoiGui, emailNguoiNhan);
      const bytes = CryptoJS.AES.decrypt(noiDungMaHoa, secretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error("Lỗi giải mã:", error);
      return "[Tin nhắn không thể giải mã]";
    }
  };

  useEffect(() => {
    let dangHoatDong = true;

    const huyDangKy = onAuthStateChanged(auth, (nguoiDungHienTai) => {
      if (nguoiDungHienTai && dangHoatDong) {
        setThongTinNguoiDung(nguoiDungHienTai);
        const thamChieuTrangThai = ref(db, `users/${chuanHoaEmail(nguoiDungHienTai.email)}`);
        const duLieuNguoiDung = {
          trangThai: "online",
          tenHienThi: nguoiDungHienTai.displayName || nguoiDungHienTai.email.split("@")[0],
          duongDanAnhDaiDien: nguoiDungHienTai.photoURL || "https://via.placeholder.com/40",
        };
        set(thamChieuTrangThai, duLieuNguoiDung);

        if (!daKhoiTaoTenHienThi) {
          setTenHienThiMoi(nguoiDungHienTai.displayName || nguoiDungHienTai.email.split("@")[0]);
          setDaKhoiTaoTenHienThi(true);
        }

        setTrangThaiNguoiDung((trangThaiTruoc) => {
          if (!trangThaiTruoc) {
            return "online";
          }
          return trangThaiTruoc;
        });

        return () => set(thamChieuTrangThai, { ...duLieuNguoiDung, trangThai: "offline" });
      } else {
        chuyenTrang("/");
      }
    });

    return () => {
      dangHoatDong = false;
      huyDangKy();
    };
  }, [chuyenTrang, daKhoiTaoTenHienThi]);

  const chuanHoaEmail = (email) => email.replace(/[@.]/g, "_");

  useEffect(() => {
    if (thongTinNguoiDung) {
      const thamChieuDanhSachTroChuyen = ref(db, `chat_list/${chuanHoaEmail(thongTinNguoiDung.email)}`);
      onValue(thamChieuDanhSachTroChuyen, (snapshot) => {
        const danhSach = snapshot.val() || [];
        const danhSachMoi = Object.values(danhSach).map((email) => {
          const duongDanTinNhan = `messages/${chuanHoaEmail(thongTinNguoiDung.email)}_${chuanHoaEmail(email)}`;
          return new Promise((resolve) => {
            onValue(
              ref(db, duongDanTinNhan),
              (msgSnapshot) => {
                const tinNhan = msgSnapshot.val();
                const tinNhanMoiNhat = tinNhan
                  ? Object.values(tinNhan).sort((a, b) => b.thoiGian - a.thoiGian)[0]
                  : null;
                onValue(
                  ref(db, `users/${chuanHoaEmail(email)}`),
                  (userSnapshot) => {
                    const duLieuNguoiDung = userSnapshot.val() || {};
                    resolve({
                      email,
                      tinNhanMoiNhat: tinNhanMoiNhat
                        ? giaiMaTinNhan(tinNhanMoiNhat.noiDung, thongTinNguoiDung.email, email)
                        : "",
                      thoiGian: tinNhanMoiNhat?.thoiGian || 0,
                      tenHienThi: duLieuNguoiDung.tenHienThi || email.split("@")[0],
                      duongDanAnhDaiDien: duLieuNguoiDung.duongDanAnhDaiDien || "https://via.placeholder.com/40",
                      trangThai: duLieuNguoiDung.trangThai || "offline",
                    });
                  },
                  { onlyOnce: true }
                );
              },
              { onlyOnce: true }
            );
          });
        });
        Promise.all(danhSachMoi).then((ketQua) =>
          setDanhSachCuocTroChuyen(ketQua.sort((a, b) => b.thoiGian - a.thoiGian))
        );
      });
    }
  }, [thongTinNguoiDung]);

  useEffect(() => {
    if (thongTinNguoiDung && emailNguoiNhan) {
      const emailNguoiDung = chuanHoaEmail(thongTinNguoiDung.email);
      const emailNguoiKhac = chuanHoaEmail(emailNguoiNhan);
      const duongDanTinNhan = `messages/${emailNguoiDung}_${emailNguoiKhac}`;
      const thamChieuTinNhan = ref(db, duongDanTinNhan);
      onValue(thamChieuTinNhan, (snapshot) => {
        const duLieu = snapshot.val();
        if (duLieu) {
          const danhSach = Object.entries(duLieu).map(([id, giaTri]) => ({
            id,
            ...giaTri,
            noiDung: giaiMaTinNhan(giaTri.noiDung, thongTinNguoiDung.email, emailNguoiNhan),
          }));
          setDanhSachTinNhan(danhSach);
          cuoiDanhSachTinNhan.current?.scrollIntoView({ behavior: "smooth" });
        } else {
          setDanhSachTinNhan([]);
        }
      });
    }
  }, [thongTinNguoiDung, emailNguoiNhan]);

  const capNhatHoSo = async () => {
    if (!thongTinNguoiDung) return;
    try {
      let duongDanAnhDaiDien = thongTinNguoiDung.photoURL;
      if (anhDaiDienMoi) {
        const formData = new FormData();
        formData.append("file", anhDaiDienMoi);
        formData.append("upload_preset", "chatapp-for-saas");
        formData.append("cloud_name", "dw88a5fct");
        const phanHoi = await axios.post("https://api.cloudinary.com/v1_1/dw88a5fct/upload", formData);
        duongDanAnhDaiDien = phanHoi.data.secure_url;
      }

      await updateProfile(auth.currentUser, {
        displayName: tenHienThiMoi,
        photoURL: duongDanAnhDaiDien,
      });

      const thamChieuTrangThai = ref(db, `users/${chuanHoaEmail(thongTinNguoiDung.email)}`);
      await set(thamChieuTrangThai, {
        trangThai: trangThaiNguoiDung,
        tenHienThi: tenHienThiMoi,
        duongDanAnhDaiDien: duongDanAnhDaiDien,
      });

      setThongTinNguoiDung({ ...thongTinNguoiDung, displayName: tenHienThiMoi, photoURL: duongDanAnhDaiDien });
      setAnhDaiDienMoi(null);
      alert("Cập nhật hồ sơ thành công!");
    } catch (loi) {
      console.error("Lỗi cập nhật hồ sơ:", loi);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  const luuEmailVaoDanhSach = (email1, email2) => {
    const thamChieuDanhSach1 = ref(db, `chat_list/${chuanHoaEmail(email1)}`);
    const thamChieuDanhSach2 = ref(db, `chat_list/${chuanHoaEmail(email2)}`);
    onValue(
      thamChieuDanhSach1,
      (snapshot) => {
        let danhSach = snapshot.val() || [];
        if (!danhSach.includes(email2)) {
          danhSach.push(email2);
          set(thamChieuDanhSach1, danhSach);
        }
      },
      { onlyOnce: true }
    );
    onValue(
      thamChieuDanhSach2,
      (snapshot) => {
        let danhSach = snapshot.val() || [];
        if (!danhSach.includes(email1)) {
          danhSach.push(email1);
          set(thamChieuDanhSach2, danhSach);
        }
      },
      { onlyOnce: true }
    );
  };

  const guiTinNhan = (duongDanTepTin = null, tenTepTin = null, loaiTepTin = null) => {
    if ((!noiDungTinNhan.trim() && !duongDanTepTin) || !emailNguoiNhan.trim()) return;
    const noiDungMaHoa = maHoaTinNhan(noiDungTinNhan, thongTinNguoiDung.email, emailNguoiNhan);
    const duLieuTinNhan = {
      noiDung: noiDungMaHoa,
      duongDanTepTin,
      tenTepTin,
      loaiTepTin,
      nguoiGui: thongTinNguoiDung.email,
      thoiGian: serverTimestamp(),
    };
    const emailNguoiDung = chuanHoaEmail(thongTinNguoiDung.email);
    const emailNguoiKhac = chuanHoaEmail(emailNguoiNhan);
    const duongDanTinNhan = `messages/${emailNguoiDung}_${emailNguoiKhac}`;
    push(ref(db, duongDanTinNhan), duLieuTinNhan);
    const duongDanTinNhanNguoc = `messages/${emailNguoiKhac}_${emailNguoiDung}`;
    push(ref(db, duongDanTinNhanNguoc), duLieuTinNhan);
    luuEmailVaoDanhSach(thongTinNguoiDung.email, emailNguoiNhan);
    setNoiDungTinNhan("");
    setTepTin(null);
    setHienThiTinNhanMoi(false);
  };

  const xoaTinNhan = (idTinNhan) => {
    if (!emailNguoiNhan) return;
    const emailNguoiDung = chuanHoaEmail(thongTinNguoiDung.email);
    const emailNguoiKhac = chuanHoaEmail(emailNguoiNhan);
    const capNhat = {};
    capNhat[`messages/${emailNguoiDung}_${emailNguoiKhac}/${idTinNhan}`] = null;
    capNhat[`messages/${emailNguoiKhac}_${emailNguoiDung}/${idTinNhan}`] = null;
    update(ref(db), capNhat);
  };

  const xoaCuocTroChuyen = (email) => {
    const emailNguoiDung = chuanHoaEmail(thongTinNguoiDung.email);
    const emailNguoiKhac = chuanHoaEmail(email);
    const duongDan = `messages/${emailNguoiDung}_${emailNguoiKhac}`;
    remove(ref(db, duongDan));
    const thamChieuDanhSach = ref(db, `chat_list/${emailNguoiDung}`);
    onValue(
      thamChieuDanhSach,
      (snapshot) => {
        let danhSach = snapshot.val() || [];
        danhSach = danhSach.filter((e) => e !== email);
        set(thamChieuDanhSach, danhSach);
      },
      { onlyOnce: true }
    );
    if (emailNguoiNhan === email) {
      setEmailNguoiNhan("");
      setDanhSachTinNhan([]);
    }
  };

  const taiTepLenCloudinary = async () => {
    if (!tepTin) return;
    const formData = new FormData();
    formData.append("file", tepTin);
    formData.append("upload_preset", "chatapp-for-saas");
    formData.append("cloud_name", "dw88a5fct");
    try {
      const phanHoi = await axios.post("https://api.cloudinary.com/v1_1/dw88a5fct/upload", formData);
      guiTinNhan(phanHoi.data.secure_url, tepTin.name, tepTin.type);
    } catch (loi) {
      console.error("Lỗi tải tệp:", loi);
    }
  };

  const chonBieuTuongCamXuc = (doiTuongEmoji) => {
    setNoiDungTinNhan((truoc) => truoc + doiTuongEmoji.emoji);
    setHienThiBieuTuongCamXuc(false);
  };

  const dangXuat = async () => {
    const thamChieuTrangThai = ref(db, `users/${chuanHoaEmail(thongTinNguoiDung.email)}`);
    await set(thamChieuTrangThai, {
      trangThai: "offline",
      tenHienThi: thongTinNguoiDung.displayName || thongTinNguoiDung.email.split("@")[0],
      duongDanAnhDaiDien: thongTinNguoiDung.photoURL || "https://via.placeholder.com/40",
    });
    await signOut(auth);
    chuyenTrang("/");
  };

  const danhSachLoc = danhSachCuocTroChuyen.filter(
    (cuocTroChuyen) =>
      cuocTroChuyen.tenHienThi.toLowerCase().includes(tuKhoaTimKiem.toLowerCase()) ||
      cuocTroChuyen.email.toLowerCase().includes(tuKhoaTimKiem.toLowerCase())
  );

  const xuLyTinNhanMoi = () => {
    setHienThiTinNhanMoi((truoc) => !truoc);
    if (hienThiTinNhanMoi) {
      setEmailNguoiNhan("");
    }
  };

  if (!thongTinNguoiDung) return <p style={{ textAlign: "center", padding: "20px" }}>Đang tải...</p>;

  return (
    <div className="container">
      <div className="header">
        <div>
          <img src="/logo192.png" alt="Logo" style={{ width: "40px", height: "40px" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src={thongTinNguoiDung.photoURL || "https://via.placeholder.com/40"}
            alt="Ảnh đại diện"
            style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
          />
          <span style={{ fontSize: "16px", fontWeight: "500" }}>
            {thongTinNguoiDung.displayName || thongTinNguoiDung.email.split("@")[0]}
          </span>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: trangThaiNguoiDung === "online" ? "#00CC00" : "#999",
            }}
          ></span>
          <button
            onClick={() => setHienThiMenu(!hienThiMenu)}
            style={{ fontSize: "24px", background: "none", border: "none", cursor: "pointer" }}
          >
            ☰
          </button>
          {hienThiMenu && (
            <div className="menu-dropdown">
              <button
                onClick={() => {
                  setHienThiThongTinTaiKhoan(true);
                  setHienThiMenu(false);
                }}
                className="menu-button"
              >
                Thông tin tài khoản
              </button>
              <button onClick={dangXuat} className="menu-button">
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="main-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <h3 className="sidebar-title">Cuộc trò chuyện</h3>
            <button onClick={xuLyTinNhanMoi} className="new-message-button">💬</button>
          </div>
          <div className="search-container">
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={tuKhoaTimKiem}
              onChange={(e) => setTuKhoaTimKiem(e.target.value)}
              className="search-input"
            />
          </div>
          <ul className="chat-list">
            {danhSachLoc.map((cuocTroChuyen) => (
              <li
                key={cuocTroChuyen.email}
                onClick={() => setEmailNguoiNhan(cuocTroChuyen.email)}
                className="chat-item"
                style={{
                  backgroundColor: cuocTroChuyen.email === emailNguoiNhan ? "#E8F5FF" : "transparent",
                }}
              >
                <div className="chat-info">
                  <img src={cuocTroChuyen.duongDanAnhDaiDien} alt="Ảnh đại diện" className="chat-avatar" />
                  <div>
                    <span className="chat-name">{cuocTroChuyen.tenHienThi}</span>
                    <p className="latest-msg">
                      {cuocTroChuyen.tinNhanMoiNhat.slice(0, 30) + (cuocTroChuyen.tinNhanMoiNhat.length > 30 ? "..." : "")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    xoaCuocTroChuyen(cuocTroChuyen.email);
                  }}
                  className="delete-chat-button"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="chat-area">
          {hienThiThongTinTaiKhoan ? (
            <div className="account-info">
              <h2 className="account-title">Thông tin tài khoản</h2>
              <div className="account-details">
                <img
                  src={thongTinNguoiDung.photoURL || "https://via.placeholder.com/100"}
                  alt="Ảnh đại diện"
                  className="account-avatar"
                />
                <div style={{ marginTop: "20px" }}>
                  <label style={{ display: "block", marginBottom: "5px" }}>Tên hiển thị:</label>
                  <input
                    type="text"
                    value={tenHienThiMoi || ""}
                    onChange={(e) => setTenHienThiMoi(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      marginBottom: "15px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                  />
                  <label style={{ display: "block", marginBottom: "5px" }}>Ảnh đại diện:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAnhDaiDienMoi(e.target.files[0])}
                    style={{ marginBottom: "15px" }}
                  />
                  <label style={{ display: "block", marginBottom: "5px" }}>Trạng thái:</label>
                  <select
                    value={trangThaiNguoiDung || "online"}
                    onChange={(e) => setTrangThaiNguoiDung(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      marginBottom: "15px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                  >
                    <option value="online">Đang hoạt động</option>
                    <option value="offline">Ngoại tuyến</option>
                  </select>
                  <button onClick={capNhatHoSo} className="send-button">
                    Cập nhật
                  </button>
                </div>
              </div>
              <button onClick={() => setHienThiThongTinTaiKhoan(false)} className="close-button">
                Đóng
              </button>
            </div>
          ) : hienThiTinNhanMoi ? (
            <div className="chat-window">
              <div className="chat-header">
                <h3 className="chat-header-title">Đến:</h3>
                <input
                  type="email"
                  placeholder="Nhập email người nhận"
                  value={emailNguoiNhan}
                  onChange={(e) => setEmailNguoiNhan(e.target.value)}
                  className="new-message-input"
                />
              </div>
              <div className="messages-container"></div>
              <div className="input-area">
                <textarea
                  placeholder="Nhập tin nhắn..."
                  value={noiDungTinNhan}
                  onChange={(e) => setNoiDungTinNhan(e.target.value)}
                  className="text-input"
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), guiTinNhan())}
                />
                <button onClick={() => guiTinNhan()} className="send-button">➤</button>
              </div>
            </div>
          ) : !emailNguoiNhan ? (
            <div className="no-chat">
              <h2 className="no-chat-title">Chào mừng đến với Chats!</h2>
              <p className="no-chat-text">Mỗi tin nhắn là một câu chuyện – kể câu chuyện của bạn ngay bây giờ.</p>
            </div>
          ) : (
            <div className="chat-window">
              <div className="chat-header">
                {danhSachCuocTroChuyen.find((h) => h.email === emailNguoiNhan) && (
                  <>
                    <img
                      src={danhSachCuocTroChuyen.find((h) => h.email === emailNguoiNhan).duongDanAnhDaiDien}
                      alt="Ảnh đại diện"
                      className="chat-header-avatar"
                    />
                    <div>
                      <h3 className="chat-header-title">
                        {danhSachCuocTroChuyen.find((h) => h.email === emailNguoiNhan).tenHienThi}
                      </h3>
                      <span
                        className="chat-header-status"
                        style={{
                          color:
                            danhSachCuocTroChuyen.find((h) => h.email === emailNguoiNhan).trangThai === "online"
                              ? "#00CC00"
                              : "#999",
                        }}
                      >
                        {danhSachCuocTroChuyen.find((h) => h.email === emailNguoiNhan).trangThai === "online"
                          ? "Đang hoạt động"
                          : "Ngoại tuyến"}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="messages-container">
                {danhSachTinNhan.map((tinNhan) => (
                  <div
                    key={tinNhan.id}
                    className="message-bubble"
                    style={{
                      backgroundColor: tinNhan.nguoiGui === thongTinNguoiDung.email ? "#007AFF" : "#F5F5F5",
                      color: tinNhan.nguoiGui === thongTinNguoiDung.email ? "#FFF" : "#333",
                      marginLeft: tinNhan.nguoiGui === thongTinNguoiDung.email ? "auto" : "0",
                      marginRight: tinNhan.nguoiGui === thongTinNguoiDung.email ? "0" : "auto",
                    }}
                  >
                    <div className="message-content">
                      {tinNhan.noiDung && <p className="message-text">{tinNhan.noiDung}</p>}
                      {tinNhan.duongDanTepTin && (
                        <div>
                          {tinNhan.loaiTepTin?.startsWith("image/") ? (
                            <img src={tinNhan.duongDanTepTin} alt={tinNhan.tenTepTin} className="media" />
                          ) : tinNhan.loaiTepTin?.startsWith("video/") ? (
                            <video controls src={tinNhan.duongDanTepTin} className="media" />
                          ) : (
                            <a
                              href={tinNhan.duongDanTepTin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-link"
                            >
                              📄 {tinNhan.tenTepTin}
                            </a>
                          )}
                        </div>
                      )}
                      <span className="timestamp">
                        {tinNhan.thoiGian
                          ? new Date(tinNhan.thoiGian).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                          : "Đang gửi..."}
                      </span>
                    </div>
                    {tinNhan.nguoiGui === thongTinNguoiDung.email && (
                      <button onClick={() => xoaTinNhan(tinNhan.id)} className="delete-message-button">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <div ref={cuoiDanhSachTinNhan} />
              </div>
              <div className="input-area">
                <button onClick={() => setHienThiBieuTuongCamXuc(!hienThiBieuTuongCamXuc)} className="emoji-button">
                  ☺
                </button>
                {hienThiBieuTuongCamXuc && (
                  <div className="emoji-picker">
                    <EmojiPicker onEmojiClick={chonBieuTuongCamXuc} />
                  </div>
                )}
                <label className="file-button">
                  📄
                  <input type="file" onChange={(e) => setTepTin(e.target.files[0])} style={{ display: "none" }} />
                </label>
                <textarea
                  placeholder="Nhập tin nhắn..."
                  value={noiDungTinNhan}
                  onChange={(e) => setNoiDungTinNhan(e.target.value)}
                  className="text-input"
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), guiTinNhan())}
                />
                {tepTin && (
                  <button onClick={taiTepLenCloudinary} className="send-file-button">
                    Gửi tệp
                  </button>
                )}
                <button onClick={() => guiTinNhan()} className="send-button">➤</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;