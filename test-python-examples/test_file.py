

def greet(name):
    return f"Hello, {name}! Welcome to the world of Python."

def add_numbers(a, b):
    return a + b

if __name__ == "__main__":
    
    user_name = input("Please enter your name: ")
    message = greet(user_name)
    print(message)
    num1 = 10
    num2 = 5
    sum_result = add_numbers(num1, num2)
    print(f"The sum of {num1} and {num2} is: {sum_result}")

    print("\nCounting from 1 to 3:")
    for i in range(1, 4):
        print(i)