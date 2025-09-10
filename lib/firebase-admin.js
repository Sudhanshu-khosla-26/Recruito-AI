import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "hirelog-9c804",
            clientEmail: "firebase-adminsdk-fbsvc@hirelog-9c804.iam.gserviceaccount.com",
            privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/ErQKg+jq9EwI\nav4l1srChURG9RH4OpnAsWPqI7ueYzAxmVeJmqGvrHkWCtgNtfwl0DrsX8KAYiHl\napRF9t+Fyzu/1EzHttlB8LutlyrgMYQ8XJwCnlhkSvvi7rXPRoPmndIyWcTg+kBa\nohPnqdC2mZxeG5v+vNjgKWvQEFUVzqyjVmzb3GYieGTNdHht0Xh71ZIwEQ/NaHjR\nA1JD1jULHY2vo8hSOC1pdQOCRt89R9jwkZttmGpKocLKTIyi9nXjNxE1aTJ4XcaD\nUr0kiR+EteCd2/ac06kDvraJdJqDyUxuDKqLQ2uqkA9kzqkhIqnKPUzHSTAxvbri\nJBtNtTsBAgMBAAECggEAAPCuVN1mHPrv7f0oqbw+RCmjzBuVeRjUO/dig13ExAjS\ng4lL+AufBhOkWFaeFCuOQ4A3YvnYngVQBAVghOE/aU/dOIFHuJZVVBeYxJGq7Kip\neNztEJ9DiLcKxMLb5i/3rrI43Du+39AYBYuZQHl8ifLtZR3QetIcqoeEUDajJcCK\nclkZSi+3djcvmIHMYPVZjoGSrHUI716qBry8zQRK0ZtREmK69wsti7/nejoUtV8z\naC3wk9z2alBg+J0Sp6L5gaq1koBoIXFMVgyyc7toD/k2E5wo/SVm0xKwZ9SYZ6r0\nVXX9fAZAFplLWh5AhPvO5x2UhMDm0UfmrmDYO/zFSQKBgQDvln75fM1JlCcbDaTp\nYqCk8pmpOG32W7/sAXVVTRYvm/jkjRn46hqmaG9Y7ajgb75ElERMog/z/HZwcSr4\nGA+fTGwzMsHStJ97rHm/Ns1p1SFsOkIyBjDlpQ0RDthO6DXgQeBwyUKjELn8Khq0\nS6xCOIusdWrEpixZfH1RlAH/ZQKBgQDMKW7c3MMz/i86qzroEP/YyVnEHM7AcxI3\nt0//7OvQlujk74z74vri/pJmBeDQ8Kj+KTgHrvIgfeq+VT9FDJK36aEF6+mqb6Y4\nA/CQ8pjDFaPV1BtLlJTn30EmYjRHjLx5X/AzAqZNBVSwVEn2FxTxz8kt+k4xCeKB\nhQNXViY5bQKBgCDWCXT8C86nxWxJxG5QHCA/N5wfpcJ79KPN11zngcDoqYX5aLPa\nsehYq9oOSHTqG7OednXiSDlyQnFKsU7rTUjR2opxzGqqYqk6jD0Or7xvf3Mr0OK2\nQoFWy6Go3TCDVs7zeGU80Cs1IahTxPEs5eD1iv8J4KYu+CkTjMFffZ6ZAoGBAK6r\njCP95CwpfjLNqJo/YQUST3CPzPut95ofhZxKEP7m/d5QbOhcK5Xlg08yHEPmgk7g\n6QT50kGmOR4aRQVIWoZqpc8xJTsiRq2KAVmhlLzjWMZqr+eb+UHgKhcy0dOdPusA\n/7pEvA8NToWFt7mJyeuQgGiLzDX8ZQO2z0L7e7yJAoGARCJVX9NvOlwSeQ+VZ3Iz\nCOZMY59d89jqcDe+GQwLgY+ogT9LxhqBdyBBacgvaFw90bQgWYzioshk2L0Edc+0\nmaBDkgiWqn/986wHGEbQ3tugNkafoKAJ1wfBMlquOfEgx57o6rImaqrnVjrI/+XW\nK9ohCbKlQ9OP3uR/MtrKsXQ=\n-----END PRIVATE KEY-----\n",
        }),
        storageBucket: "hirelog-9c804.firebasestorage.app"
    });
}

export const adminAuth = admin.auth();
export const adminDB = admin.firestore();
export const bucket = admin.storage().bucket("hirelog-9c804.firebasestorage.app");
