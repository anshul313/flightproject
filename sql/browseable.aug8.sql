 SELECT c.user1,
    c.user2,
    c.city,
    c.user1_flight,
    flight1.origin,
    flight1.destination,
    flight1.number,
    flight1.airline,
    c.user2_flight,
    c.user1_time,
    c.user2_time,
    l12.is_liked AS liked_12,
    l21.is_liked AS liked_21,
    user2.name AS user2_name,
    user2.city AS user2_city,
    user2.designation AS user2_designation,
    user2.profile_pic AS user2_profile_pic,
    user2.intent AS user2_intent,
    edu2.education AS user2_education,
    exp2.experience AS user2_experience,
    int2.interest AS user2_interest,
    (c.user1_flight = c.user2_flight) AS is_same_flight
   FROM (((((((( SELECT a.user_id AS user1,
            b.user_id AS user2,
            a.city,
            a.flight_id AS user1_flight,
            b.flight_id AS user2_flight,
            a."time" AS user1_time,
            b."time" AS user2_time
           FROM arrival_cum_departure a,
            arrival_cum_departure b
          WHERE ((a.user_id <> b.user_id) AND (a.city = b.city) 
                      AND ((a."time" - b."time") > interval '-2 hours') 
                      AND ((a."time" - b."time") < interval '2 hours')
                )) c
     LEFT JOIN "like" l12 ON (((c.user1 = l12.user1) AND (c.user2 = l12.user2))))
     LEFT JOIN "like" l21 ON (((c.user1 = l21.user2) AND (c.user2 = l21.user1))))
     LEFT JOIN "user" user2 ON ((c.user2 = user2.id)))
     LEFT JOIN ( SELECT user_education.user_id,
            json_agg(ROW(user_education.institute_name, user_education.qualification)) AS education
           FROM user_education
          GROUP BY user_education.user_id) edu2 ON ((edu2.user_id = c.user2)))
     LEFT JOIN ( SELECT user_experience.user_id,
            json_agg(ROW(user_experience.company_name, user_experience.designation)) AS experience
           FROM user_experience
          GROUP BY user_experience.user_id) exp2 ON ((exp2.user_id = c.user2)))
     LEFT JOIN ( SELECT user_interest.user_id,
            json_agg(user_interest.interest) AS interest
           FROM user_interest
          GROUP BY user_interest.user_id) int2 ON ((int2.user_id = c.user2)))
     LEFT JOIN flight flight1 ON ((c.user1_flight = flight1.id)));
