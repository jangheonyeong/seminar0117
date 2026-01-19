const btn = document.querySelector("#dangerBtn");
const warning = document.querySelector("#warning");

let clickedCount = 0;

btn.addEventListener("click", () => {
  clickedCount += 1;

  // 메시지 표시
  warning.hidden = false;

  // 클릭할수록 더 "화난" 느낌(텍스트는 요청대로 동일하게 유지)
  btn.classList.remove("shake");
  // reflow 트릭으로 애니메이션 재시작
  void btn.offsetWidth;
  btn.classList.add("shake");

  // 버튼 라벨은 유지하되, 미묘한 상태 변화만 주기
  btn.dataset.clicked = "true";

  // 두 번째 클릭부터는 경고 박스를 더 강조
  if (clickedCount >= 2) {
    warning.classList.add("louder");
  }
});
