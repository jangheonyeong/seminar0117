import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const dangerBtn = document.querySelector("#dangerBtn");
const goBasicBtn = document.querySelector("#goBasicBtn");

let clickedCount = 0;

dangerBtn.addEventListener("click", async () => {
  clickedCount += 1;

  // 버튼 흔들림(기존 느낌 유지)
  dangerBtn.classList.remove("shake");
  void dangerBtn.offsetWidth; // 애니메이션 재시작
  dangerBtn.classList.add("shake");
  dangerBtn.dataset.clicked = "true";

  // SweetAlert2 경고창
  await Swal.fire({
    icon: "warning",
    title: "I Said Do Not Click This Button",
    html: clickedCount >= 2 ? "…또 누르셨네요." : "You were warned.",
    confirmButtonText: "OK",
    buttonsStyling: false, // CSS로 버튼 스타일 완전 커스텀
    customClass: {
      popup: "swal-navy-popup",
      title: "swal-navy-title",
      htmlContainer: "swal-navy-text",
      confirmButton: "swal-navy-confirm",
      icon: "swal-navy-icon",
    },
    backdrop: "rgba(2, 6, 18, 0.72)",
    showClass: { popup: "swal2-show swal-navy-show" },
    hideClass: { popup: "swal2-hide swal-navy-hide" },
  });
});

// basicChatbot.html로 이동
goBasicBtn.addEventListener("click", () => {
  // Vite에서 보통 루트(public 또는 프로젝트 루트의 html) 기준으로 접근합니다.
  window.location.href = "/basicChatbot.html";
});
