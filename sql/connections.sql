 SELECT future.user1,
    future.user2,
    future.name,
    future.profile_pic,
    future.past_origin,
    future.past_destination,
    future.past_time,
    future.past_number,
    future.past_airline,
    first(future.origin) AS future_origin,
    first(future.destination) AS future_destination,
    first(future."time") AS future_time,
    first(future.number) AS future_number,
    first(future.airline) AS future_airline
   FROM ( SELECT past1.user1,
            past1.user2,
            past1.name,
            past1.profile_pic,
            past1.past_origin,
            past1.past_destination,
            past1.past_time,
            past1.past_number,
            past1.past_airline,
            browseable.origin,
            browseable.destination,
            browseable.user1_time AS "time",
            browseable.number,
            browseable.airline
           FROM (( SELECT past.user1,
                    past.user2,
                    past.name,
                    past.profile_pic,
                    first(past.origin) AS past_origin,
                    first(past.destination) AS past_destination,
                    first(past."time") AS past_time,
                    first(past.number) AS past_number,
                    first(past.airline) AS past_airline
                   FROM ( SELECT conn.user1,
                            conn.user2,
                            conn.name,
                            conn.profile_pic,
                            browseable_1.origin,
                            browseable_1.destination,
                            browseable_1.user1_time AS "time",
                            browseable_1.number,
                            browseable_1.airline
                           FROM (( SELECT a.user1,
                                    a.user2,
                                    c.name,
                                    c.profile_pic
                                   FROM "like" a,
                                    "like" b,
                                    "user" c
                                  WHERE ((a.user1 = b.user2) AND (a.user2 = b.user1) AND (a.is_liked = true) AND (b.is_liked = true) AND (a.user2 = c.id))) conn
                             LEFT JOIN browseable browseable_1 ON (((conn.user1 = browseable_1.user1) AND (conn.user2 = browseable_1.user2) AND (browseable_1.user1_flight = browseable_1.user2_flight) AND (browseable_1.user1_time <= now()))))
                          ORDER BY browseable_1.user1_time DESC) past
                  GROUP BY past.user1, past.user2, past.name, past.profile_pic) past1
             LEFT JOIN browseable ON (((past1.user1 = browseable.user1) AND (past1.user2 = browseable.user2) AND (browseable.user1_flight = browseable.user2_flight) AND (browseable.user1_time >= now()))))
          ORDER BY browseable.user1_time) future
  GROUP BY future.user1, future.user2, future.name, future.profile_pic, future.past_origin, future.past_destination, future.past_time, future.past_number, future.past_airline;
