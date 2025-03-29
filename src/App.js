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
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import "./App.css";

function App() {
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState("");
  const [hienThiDangKy, setHienThiDangKy] = useState(false);
  const [hienThiQuenMatKhau, setHienThiQuenMatKhau] = useState(false);
  const [hienThiMenu, setHienThiMenu] = useState(false);
  const [hienThiDangNhap, setHienThiDangNhap] = useState(false);
  const [thongBao, setThongBao] = useState("");
  const [nguoiDung, setNguoiDung] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const huyDangNhap = onAuthStateChanged(auth, (nguoiDungHienTai) => {
      if (nguoiDungHienTai) {
        setNguoiDung(nguoiDungHienTai);
        setTimeout(() => navigate("/chat"), 10000);
      } else {
        setNguoiDung(null);
      }
    });
    return () => huyDangNhap();
  }, [navigate]);

  const luuNguoiDungVaoDB = (nguoiDung) => {
    const nguoiDungRef = ref(db, `users/${nguoiDung.uid}`);
    get(nguoiDungRef).then((snapshot) => {
      if (!snapshot.exists()) {
        set(nguoiDungRef, {
          email: nguoiDung.email,
          tenHienThi: nguoiDung.displayName || "Người dùng mới",
          anhDaiDien: nguoiDung.photoURL || "",
          uid: nguoiDung.uid,
        });
      }
    });
  };

  const hienThongBao = (noiDung) => {
    setThongBao(noiDung);
    setTimeout(() => setThongBao(""), 1000);
  };

  const dangKy = async () => {
    if (!email) {
      hienThongBao("Trường email không được bỏ trống.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      hienThongBao("Trường email phải là một địa chỉ email hợp lệ.");
      return;
    }
    if (!matKhau) {
      hienThongBao("Trường mật khẩu không được bỏ trống.");
      return;
    }
    if (!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&*!,.]).{6,12}/.test(matKhau)) {
      hienThongBao(
        "Mật khẩu nên có từ 6-12 ký tự trở lên, phải chứa ít nhất 1 ký tự viết hoa, 1 ký tự viết thường, 1 ký tự số và 1 ký tự đặc biệt."
      );
      return;
    }
    if (matKhau !== xacNhanMatKhau) {
      hienThongBao("Trường mật khẩu không chính xác.");
      return;
    }
    try {
      const nguoiDungRef = ref(db, `users`);
      const snapshot = await get(nguoiDungRef);
      if (snapshot.exists()) {
        const users = snapshot.val();
        const emailDaTonTai = Object.values(users).some((user) => user.email === email);
        if (emailDaTonTai) {
          hienThongBao("Trường email đã có trong cơ sở dữ liệu.");
          return;
        }
      }
      const taiKhoanMoi = await createUserWithEmailAndPassword(auth, email, matKhau);
      setNguoiDung(taiKhoanMoi.user);
      luuNguoiDungVaoDB(taiKhoanMoi.user);
      hienThongBao("Đăng ký tài khoản thành công!");
      setEmail("");
      setMatKhau("");
      setXacNhanMatKhau("");
    } catch (loi) {
      hienThongBao(`Lỗi: ${loi.message}`);
    }
  };

  const dangNhap = async () => {
    if (!email) {
      hienThongBao("Trường email không được bỏ trống.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      hienThongBao("Trường email phải là một địa chỉ email hợp lệ.");
      return;
    }
    if (!matKhau) {
      hienThongBao("Trường mật khẩu không được bỏ trống.");
      return;
    }
    try {
      const taiKhoan = await signInWithEmailAndPassword(auth, email, matKhau);
      setNguoiDung(taiKhoan.user);
      hienThongBao("Đăng nhập thành công!");
      setEmail("");
      setMatKhau("");
    } catch (loi) {
      hienThongBao("Trường mật khẩu không chính xác.");
    }
  };

  const dangNhapGoogle = async () => {
    try {
      const taiKhoan = await signInWithPopup(auth, googleProvider);
      setNguoiDung(taiKhoan.user);
      luuNguoiDungVaoDB(taiKhoan.user);
      hienThongBao("Đăng nhập bằng Google thành công!");
    } catch (loi) {
      hienThongBao(`Lỗi: ${loi.message}`);
    }
  };

  const quenMatKhau = async () => {
    if (!email) {
      hienThongBao("Trường email không được bỏ trống.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      hienThongBao("Trường email phải là một địa chỉ email hợp lệ.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      hienThongBao(
        "Hướng dẫn đổi mật khẩu đã được gửi vào email của bạn, vui lòng kiểm tra email và làm theo hướng dẫn."
      );
    } catch (loi) {
      hienThongBao(`Lỗi: ${loi.message}`);
    }
  };

  const dangXuat = async () => {
    try {
      await signOut(auth);
      setNguoiDung(null);
      hienThongBao("Đăng xuất thành công!");
    } catch (loi) {
      hienThongBao(`Lỗi: ${loi.message}`);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <div>
          <img src="/logo192.png" alt="Logo" className="logo" />
        </div>
        <div>
          <button onClick={() => setHienThiMenu(!hienThiMenu)} className="menu-btn">
            ☰
          </button>
          {hienThiMenu && (
            <div className="menu-dropdown">
              <button
                onClick={() => {
                  setHienThiDangNhap(true);
                  setHienThiDangKy(false);
                  setHienThiMenu(false);
                }}
                className="menu-item"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => {
                  setHienThiDangKy(true);
                  setHienThiDangNhap(false);
                  setHienThiMenu(false);
                }}
                className="menu-item"
              >
                Đăng ký tài khoản
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        {!hienThiDangNhap && !hienThiDangKy && !nguoiDung && (
          <p className="login-prompt">Vui lòng đăng nhập</p>
        )}

        {(hienThiDangNhap || nguoiDung || hienThiDangKy || hienThiQuenMatKhau) && (
          <div className="form-container">
            {nguoiDung ? (
              <>
                <h3 className="welcome-text">👋 Xin chào, {nguoiDung.displayName || nguoiDung.email}!</h3>
                <div className="avatar-container">
                  {nguoiDung?.photoURL ? (
                    <img src={nguoiDung.photoURL} alt="Avatar" className="avatar" />
                  ) : (
                    <div className="default-avatar">🖼️</div>
                  )}
                </div>
                <button onClick={dangXuat} className="logout-btn">Đăng xuất</button>
              </>
            ) : hienThiQuenMatKhau ? (
              <>
                <button onClick={() => setHienThiQuenMatKhau(false)} className="close-btn">✕</button>
                <h2 className="form-title">Khôi phục mật khẩu</h2>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={
                    thongBao === "Trường email không được bỏ trống." ||
                    thongBao === "Trường email phải là một địa chỉ email hợp lệ."
                      ? "input-error"
                      : "input"
                  }
                />
                <button onClick={quenMatKhau} className="btn">Khôi phục</button>
              </>
            ) : hienThiDangKy ? (
              <>
                <button onClick={() => setHienThiDangKy(false)} className="close-btn">✕</button>
                <h2 className="form-title">Đăng ký</h2>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={thongBao.includes("email") ? "input-error" : "input"}
                />
                <label className="form-label">Mật khẩu</label>
                <input
                  type="password"
                  placeholder="mật khẩu"
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  className={thongBao.includes("mật khẩu") ? "input-error" : "input"}
                />
                <label className="form-label">Nhập lại mật khẩu</label>
                <input
                  type="password"
                  placeholder="nhập lại mật khẩu"
                  value={xacNhanMatKhau}
                  onChange={(e) => setXacNhanMatKhau(e.target.value)}
                  className={matKhau !== xacNhanMatKhau && xacNhanMatKhau ? "input-error" : "input"}
                />
                <button onClick={dangKy} className="btn">Đăng ký</button>
                <p className="form-switch">
                  Đã có tài khoản?{" "}
                  <span
                    onClick={() => {
                      setHienThiDangKy(false);
                      setHienThiDangNhap(true);
                    }}
                    className="link"
                  >
                    Đăng nhập ngay
                  </span>
                </p>
              </>
            ) : hienThiDangNhap ? (
              <>
                <button onClick={() => setHienThiDangNhap(false)} className="close-btn">✕</button>
                <h2 className="form-title">Đăng nhập</h2>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={thongBao.includes("email") ? "input-error" : "input"}
                />
                <div className="password-label-container">
                  <label className="form-label">Mật khẩu</label>
                  <span onClick={() => setHienThiQuenMatKhau(true)} className="link">
                    Quên mật khẩu?
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="mật khẩu"
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  className={thongBao.includes("mật khẩu") ? "input-error" : "input"}
                />
                <button onClick={dangNhap} className="btn">Đăng nhập</button>
                <p className="or-divider">
                  <span>HOẶC</span>
                </p>
                <button onClick={dangNhapGoogle} className="google-btn">ĐĂNG NHẬP VỚI GOOGLE</button>
                <p className="form-switch">
                  Chưa có tài khoản?{" "}
                  <span
                    onClick={() => {
                      setHienThiDangKy(true);
                      setHienThiDangNhap(false);
                    }}
                    className="link"
                  >
                    Đăng ký ngay
                  </span>
                </p>
              </>
            ) : null}
            <p className="notification">{thongBao}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;