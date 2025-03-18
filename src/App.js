import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, db } from "./firebase-config";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInWithPopup,
    sendPasswordResetEmail,
    onAuthStateChanged,
    updateProfile,
  } from "firebase/auth";
import { ref, set } from "firebase/database";
import { uploadFile } from "./cloudinary-config";
import { v4 as uuidv4 } from "uuid";

function App() {
  // Khai báo các biến trạng thái
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [nguoiDung, setNguoiDung] = useState(null);
  const [choDoiThongTin, setChoDoiThongTin] = useState(false);
  const [tenMoi, setTenMoi] = useState("");
  const [anhMoi, setAnhMoi] = useState(null);
  const [hienThiChaoMung, setHienThiChaoMung] = useState(false);
  const navigate = useNavigate();

  // Kiểm tra trạng thái đăng nhập của người dùng
  useEffect(() => {
    const huyDangNhap = onAuthStateChanged(auth, (nguoiDungHienTai) => {
      if (nguoiDungHienTai) {
        setNguoiDung(nguoiDungHienTai);
        setHienThiChaoMung(true);
        setThongBao(`Chúc mừng bạn đã đăng nhập thành công!`);
        setTimeout(() => navigate("/chat"), 18000);
      } else {
        setNguoiDung(null);
      }
    });
    return () => huyDangNhap();
  }, [navigate]);

  // Lưu thông tin người dùng vào Firebase Realtime Database
  const luuNguoiDungVaoDB = (nguoiDung) => {
    set(ref(db, `users/${nguoiDung.uid}`), {
      email: nguoiDung.email,
      tenHienThi: nguoiDung.displayName || "Người dùng mới",
      anhDaiDien: nguoiDung.photoURL || "",
      uid: nguoiDung.uid
    });
  };

    // Đăng ký
  const dangKy = async () => {
    console.log("Mật khẩu nhập:", matKhau, "Xác nhận:", xacNhanMatKhau);

    if (matKhau.trim().length < 6 || matKhau.trim().length > 12) {
      setThongBao("Mật khẩu cần có từ 6-12 ký tự.");
      return;
    }
    if (matKhau.trim() !== xacNhanMatKhau.trim()) {
      setThongBao("Mật khẩu không khớp. Vui lòng kiểm tra lại.");
      return;
    }
    try {
      const taiKhoanMoi = await createUserWithEmailAndPassword(auth, email, matKhau.trim());
      setNguoiDung(taiKhoanMoi.user);
      luuNguoiDungVaoDB(taiKhoanMoi.user);
      setThongBao(`Chúc mừng bạn đã đăng ký thành công!`);
    } catch (loi) {
      setThongBao(`Lỗi: ${loi.message}`);
    }
  };

  // Đăng nhập
  const dangNhap = async () => {
    try {
      const taiKhoan = await signInWithEmailAndPassword(auth, email, matKhau.trim());
      setNguoiDung(taiKhoan.user);
      setThongBao(`Chúc mừng bạn đã đăng nhập thành công!`);
    } catch (loi) {
      setThongBao(`Lỗi: ${loi.message}`);
    }
  };

  // Quên mật khẩu
  const quenMatKhau = async () => {
    if (!email) {
      setThongBao("Nhập tài khoản Email để đặt lại mật khẩu.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setThongBao("Email đã được gửi thành công. Vui lòng kiểm tra hộp thư!");
    } catch (loi) {
      setThongBao(`Lỗi không gửi được Mail: ${loi.message}`);
    }
  };

  // Đăng nhập bằng Google
  const dangNhapGoogle = async () => {
    try {
      const taiKhoan = await signInWithPopup(auth, googleProvider);
      setNguoiDung(taiKhoan.user);
      luuNguoiDungVaoDB(taiKhoan.user);
      setThongBao(`Chúc mừng bạn đã đăng nhập thành công!`);
    } catch (loi) {
      setThongBao(`Lỗi không đăng nhập được với Google: ${loi.message}`);
    }
  };

  // Đăng xuất
  const dangXuat = async () => {
    try {
      await signOut(auth);
      setNguoiDung(null);
      setThongBao("Đăng xuất thành công!");
    } catch (loi) {
      setThongBao(`Lỗi không đăng xuất được: ${loi.message}`);
    }
  };

   // Cập nhật hồ sơ 
  const capNhatHoSo = async () => {
    if (!nguoiDung) return;
    try {
      let anhDaiDien = nguoiDung.photoURL;
      if (anhMoi) {
        const urlAnh = await uploadFile(anhMoi, `avatars/${uuidv4()}`);
        anhDaiDien = urlAnh;
      }
      await updateProfile(nguoiDung, {
        displayName: tenMoi || nguoiDung.displayName,
        photoURL: anhDaiDien,
      });
      set(ref(db, `users/${nguoiDung.uid}`), {
        email: nguoiDung.email,
        tenHienThi: tenMoi || nguoiDung.displayName,
        anhDaiDien: anhDaiDien,
        uid: nguoiDung.uid,
      });
      setNguoiDung({ ...nguoiDung, displayName: tenMoi, photoURL: anhDaiDien });
      setThongBao("Cập nhật thành công!");
      setChoDoiThongTin(false);
    } catch (loi) {
      setThongBao(`Lỗi: ${loi.message}`);
    }
  };

return (
    <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "Arial, sans-serif" }}>
      <h1>🔥 Chào mừng đến với Chats - Trò chuyện trực tuyến trên web</h1>
      {!nguoiDung ? (
        <>
          <input type="email" placeholder="Nhập Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ margin: "10px", padding: "10px", width: "250px", borderRadius: "5px" }} />
          <br />
          <input type="password" placeholder="Nhập mật khẩu" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} style={{ margin: "10px", padding: "10px", width: "250px", borderRadius: "5px" }} />
          <br />
          <input type="password" placeholder="Xác nhận mật khẩu" value={xacNhanMatKhau} onChange={(e) => setXacNhanMatKhau(e.target.value)} style={{ margin: "10px", padding: "10px", width: "250px", borderRadius: "5px" }} />
          <br />
          <button onClick={dangKy} style={{ padding: "10px 20px", margin: "5px", backgroundColor: "#28a745", color: "#fff", border: "none", borderRadius: "5px" }}>Đăng ký</button>
          <button onClick={dangNhap} style={{ padding: "10px 20px", margin: "5px", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "5px" }}>Đăng nhập</button>
          <br />
          <button onClick={quenMatKhau} style={{ padding: "10px 15px", backgroundColor: "#ffc107", color: "#000", margin: "10px", border: "none", borderRadius: "5px" }}>Quên mật khẩu?</button>
          <br />
          <button onClick={dangNhapGoogle} style={{ padding: "10px 20px", backgroundColor: "#db4437", color: "#fff", margin: "10px", border: "none", borderRadius: "5px" }}>Đăng nhập với Google</button>
        </>
      ) : (
        <>
          <h2>👋 Xin chào, {nguoiDung.displayName || nguoiDung.email}!</h2>
          <div onClick={() => setChoDoiThongTin((prev) => !prev)} style={{ display: "flex", justifyContent: "center", marginBottom: "20px", cursor: "pointer" }}>
            {nguoiDung?.photoURL ? (
              <img src={nguoiDung.photoURL} alt="Avatar" style={{ width: "100px", height: "100px", borderRadius: "50%" }} />
            ) : (
              <div style={{ width: "100px", height: "100px", backgroundColor: "#ccc", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "40px", color: "#666" }}>
                🖼️
              </div>
            )}
          </div>

          {choDoiThongTin && (
            <div
              style={{ position: "absolute", right: "250px", top: "100px", width: "250px", backgroundColor: "#fff", border: "1px solid #ccc", padding: "15px", borderRadius: "5px", zIndex: 10, textAlign: "center", }}
            >
              <h3>Thông tin tài khoản</h3>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>Tên hiển thị</label>
                <input 
                  type="text" 
                  placeholder="Nhập tên mới" 
                  value={tenMoi} 
                  onChange={(e) => setTenMoi(e.target.value)} 
                  style={{ width: "100%", padding: "8px", boxSizing: "border-box" }} 
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>Ảnh đại diện</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setAnhMoi(e.target.files[0])} 
                  style={{ width: "100%", boxSizing: "border-box" }} 
                />
              </div>
              <button 
                onClick={capNhatHoSo} 
                style={{ width: "100%", padding: "10px", fontWeight: "bold" }}
              >
                Cập nhật
              </button>

            </div>
          )}
          <button onClick={dangXuat}>Đăng xuất</button>
        </>
      )}
      <p>{thongBao}</p>
    </div>
  );
}

export default App;