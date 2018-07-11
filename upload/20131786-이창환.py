class mul:
    def num(self, n):
        for i in range(1,10):
            print("{0} X {1} = {2}".format(n, i, int(n)*i))

print("이창환님, 종료를 원하면 0을 입력해주세요.")

while True:
    a = input("이창환님, 단수를 입력하세요 : ")
    if int(a) == 0:
        break
    g = mul()
    g.num(a)
    

print("이창환님, 종료합니다.")
